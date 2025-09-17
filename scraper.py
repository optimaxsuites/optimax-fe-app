import scrapy
import re
import json
import os
import logging
from scrapy.exceptions import CloseSpider

from api.endpoints import DataTableEndpoints
from ..items import CavaItem
from ..loaders import CavaLoader
from ..utils.airtable_helper import AirtableHelper
from ..utils.webhook_helper import WebhookHelper
from ..utils.file_helper import FileHelper
from ..utils.error_helper import send_error_to_webhook
from .base_spider import BaseAuthenticatedSpider

class IsaSpider(BaseAuthenticatedSpider):
    """
    Spider that crawls and extracts student data from the ISA system.
    
    This spider handles:
    1. ISA listing and signatures
    2. Student details
    3. Assessment information
    4. PDF download and processing
    5. Integration with Airtable and webhooks
    """
    name = 'isa'
   
    def __init__(self, student_id=None, *args, **kwargs):
        super(IsaSpider, self).__init__(*args, **kwargs)
        self.student_id = student_id
        
        # Initialize helpers
        self.file_helper = FileHelper()
        self.airtable_helper = AirtableHelper()
        self.webhook_helper = WebhookHelper()
        
    def authenticated_requests(self):
        """Start crawling based on student_id or fetch all ISAs"""
        if self.student_id:
            self.logger.info(f"Starting to scrape student data for ID: {self.student_id}")
            url = f'https://sped.fusionpl.us/students/student/{self.student_id}'
            yield scrapy.Request(
                url=url,
                callback=self.parse_student_detail,
                dont_filter=True,
                meta={'item': CavaItem()}
            )
        else:
            self.logger.info("Starting to fetch ISA data")
            url = DataTableEndpoints.get_isas_endpoint(0, 10)
            yield scrapy.Request(
                url=url,
                callback=self.parse_isas,
                dont_filter=True,
                meta={'item': CavaItem()}
            )

    #----------------------
    # ISA related methods
    #----------------------
    
    def parse_isas(self, response):
        """Parse the list of ISAs and follow links"""
        self.logger.info(f"Received List of ISAs response with status: {response.status}")
        try:
            data = response.json()
            for row in data.get('aaData', []):
                html_content = row[0]
                links = re.findall(r'href="([^"]+)"', html_content)
                for link in links:
                    yield response.follow(
                        link,
                        self.parse_links,
                        meta={'item': response.meta['item']},
                        dont_filter=True  # *** ADD THIS LINE ***
                    )
                
        except ValueError as e:
            error_message = f"Invalid JSON response: {e}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "parsing ISAs", error_message)

    def parse_links(self, response): 
        """Process links from ISA list - either sign or view"""
        try:

            new_item = CavaItem()

            if 'sign' in response.url:
                        self.logger.info("Found sign link: %s", response.url)
                        yield self.sign_isa(response)
            if 'view' in response.url:
                        self.logger.info("Processing URL: %s", response.url)
                        yield from self.get_data_from_link(response, new_item)
            
        except ValueError as e:
            error_message = f"Invalid JSON response: {e}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "parsing links", error_message)

    def get_data_from_link(self, response, item):
        """Extract data from ISA view link and follow to student details"""
        # Create new loader instance
        loader = CavaLoader(item=item, response=response)
        
        # Extract ISA related fields
        loader.add_css('student_name', 'select#student-list-view option::text')
        loader.add_css('iep_due_date', 'input#iep-due-date::attr(value)')
        loader.add_css('student_id', 'input#student-id::attr(value)')
        loader.add_css('iep_service', 'select#service-list-view option::text')
        loader.add_css('mode', 'select#delivery-mode option::text')
        loader.add_xpath('school', '//input[@id="school"]/@value')
        student_id = response.xpath('//input[@id="student-id"]/@value').get()
        school_period = response.css('select#school-period-view option::text').get()

        loader.add_value('student_id', student_id)
        item = loader.load_item()

        # family_id = response.xpath('//input[@id="family-id"]/@value').get()
        if student_id:
        #     item['family_id'] = family_id
        #     url = f'https://sped.fusionpl.us/students/student/{family_id}'
        #     yield scrapy.Request(
        #         url=url,
        #         callback=self.parse_student_detail,
        #         meta={'item': item}
        #     )
            self.assessment_count = 0
            self.logger.info(
                f"[{self.assessment_count}] fetch assessment for student_id={item['student_id']}"
            )
            url = DataTableEndpoints.get_assessments(0, 1, item['student_id'])
            yield scrapy.Request(
                url=url,
                callback=self.parse_assessment_table,
                meta={'item': item.copy()},
                dont_filter=True  
            )
        else:
            yield item


    def sign_isa(self, response):
        """Sign an ISA using the API endpoint"""
        try:
            # Extract the ISA ID from the URL
            match = re.search(r'/isas/sign/([a-f0-9]+)', response.url)
            if not match:
                self.logger.error("Could not extract ISA ID from URL")
                return None
                
            isa_id = match.group(1)
            self.logger.info(f"Processing ISA signature for ID: {isa_id}")
            
            # Get request configuration for ISA update
            config = self._get_isa_update_config(isa_id)
            
            # Return a request directly instead of using yield
            return scrapy.Request(
                url=config['url'],
                method=config['method'],
                body=json.dumps(config['data']),
                headers=config['headers'],
                callback=self.handle_isa_update,
                dont_filter=True
            )
               
        except Exception as e:
            error_message = f"Error in sign_isa: {str(e)}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "signing ISA", error_message)
            return None

    
    def _get_isa_update_config(self, isa_id):
        """Get API configuration for ISA update"""
        url = f'https://sped.fusionpl.us/isas/isa/{isa_id}'
        data = {
            "id": isa_id,
            "name": "Laila Windemuth", 
            "title": "Psych Lead"
        }
        headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        return {
            'url': url,
            'method': 'PUT',
            'data': data,
            'headers': headers
        }
        
    def handle_isa_update(self, response):
        """Handle the response from ISA update API"""
        try:
            if response.status == 200:
                result = response.json()
                self.logger.info(f"Successfully updated ISA: {result}")
                return result
            else:
                self.logger.error(f"Failed to update ISA. Status: {response.status}")
                self.logger.error(f"Response: {response.text}")
                return None
                
        except json.JSONDecodeError as e:
            error_message = f"Invalid JSON response: {response.text}, Error: {e}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "updating ISA", error_message)
            return None
        except Exception as e:
            error_message = f"Error handling ISA update: {str(e)}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "handling ISA update", error_message)
            return None
    
    #----------------------
    # Student detail methods
    #----------------------
            
    def parse_student_detail(self, response):
        """Parse student detail page and extract student information"""
       # Create new loader with previous item data
        loader = CavaLoader(item=response.meta['item'], response=response)
        
        # Basic student info
        loader.add_css('first_name', 'input[placeholder="First Name"]::attr(value)')
        loader.add_css('last_name', 'input[placeholder="Last Name"]::attr(value)')
        loader.add_xpath('gender', '//input[@name="gender" and @checked]/../label/text()')
        loader.add_css('birthday', 'input[placeholder="Birthday"]::attr(value)')
        loader.add_css('ethnicity', 'input[placeholder="Ethnicity"]::attr(value)')
        loader.add_css('race', 'input[placeholder="Race"]::attr(value)')
        loader.add_css('grade', 'input[placeholder="Grade"]::attr(value)')
        loader.add_xpath('ell', '//div[contains(@class, "row")]//label[contains(text(), "English Learner")]/../following-sibling::div/input/@value') 
        loader.add_css('sped_teacher', 'input[placeholder="Special Ed Teacher"]::attr(value)')
        
        # Contact info
        loader.add_xpath('address', '//label[contains(text(), "Home Address")]/following::input[1]/@value')
        loader.add_xpath('phone', '//label[contains(text(), "Home Phone")]/following::input[1]/@value')
        
        # School info
        loader.add_css('primary_teacher', 'input[placeholder="Primary Teacher"]::attr(value)')
        
        # Disability info
        loader.add_css('primary_disability', '#s2id_primary-disability .select2-choice span::text')
        loader.add_css('secondary_disability', '#s2id_secondary-disability .select2-choice span::text')
        
        # Notes and dates
        notes = response.css('textarea#notes::text').get()
        if notes:
            notes = notes.replace('\n', ' ')
            loader.add_value('notes', notes)
        else:
            loader.add_css('notes', 'textarea#notes::text')

        
        loader.add_css('next_plan_review', 'input#next-annual::attr(value)')
        loader.add_css('triennial_due', 'input#triennial-due::attr(value)')

        # Handle LC info - parse Learning Coach name and email
        self._parse_lc_info(response, loader)

        item = loader.load_item()

        pdf_url = response.meta.get('pdf_url')
        filename = response.meta.get('filename')
        if pdf_url and filename:
            # If PDF URL and filename are provided, handle the PDF download
            self.logger.info(f"Found PDF URL: {pdf_url}, Filename: {filename}")
            yield scrapy.Request(
                url=pdf_url,
                callback=self.handle_pdf_download,
                meta={'item': item, 'filename': filename},
                priority=10,
                dont_filter=True
            )
        else:
            # If no PDF, just yield the item
            self.logger.info("No PDF found, yielding student item")
            yield item
        
        # Proceed to assessment data
        # url = DataTableEndpoints.get_assessments(0, 10, item['student_id'])
        # yield scrapy.Request(
        #     url=url,
        #     callback=self.parse_assessment_table,
        #     meta={'item': item}
        # )
    
    def _parse_lc_info(self, response, loader):
        """Extract Learning Coach info from the response"""
        lc_info = response.xpath('//label[text()="LC Name / Email Address"]/../following-sibling::div/input/@value').get()
        if lc_info:
            lc_info = lc_info.strip()
            parts = [part.strip() for part in lc_info.split('/')]
            if len(parts) >= 2:
                loader.add_value('parent_name', parts[0])
                loader.add_value('parent_email', parts[1])
            elif len(parts) == 1:
                loader.add_value('parent_name', parts[0])

    #----------------------
    # Assessment methods
    #----------------------

    def parse_assessment_table(self, response):
        """
        *** FIXED ***
        Parse assessment table and follow links for ALL assessments, not just the first.
        """
        try:
            data = response.json()
            # Loop through all rows in the data, not just the first one.
            if data.get('aaData', []):
                self.logger.info(f"Received assessment data with {len(data['aaData'])} rows")
                first_row = data['aaData'][0]
                self.logger.info(f"First row content: {first_row}")
                html_content = first_row[0]
                # Find all links in the row content.
                links = re.findall(r'href="([^"]+)"', html_content)
                if links:

                    new_item = CavaItem()

                    new_item.update(response.meta['item'])
                    # For each link found, follow it to get the assessment details.
                    # We pass a copy of the item to ensure data from different ISAs doesn't mix.
                    yield response.follow(
                        links[0],
                        self.parse_assessment_detail,
                        meta={'item': new_item}
                    )
        except ValueError as e:
            error_message = f"Invalid JSON response: {e}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "parsing assessment table", error_message)
        except Exception as e:
            error_message = f"Error in parse_assessment_table: {str(e)}"
            self.logger.error(error_message)
            send_error_to_webhook(self.name, "parsing assessment table", error_message)

    def parse_assessment_detail(self, response):
        """Parse assessment detail page and extract assessment information"""
        # Create new loader with previous item data
        loader = CavaLoader(item=response.meta['item'], response=response)
       
        # Extract assessment info
        loader.add_css('assessment_plan', 'select#assessment-type-select option[selected]::text')
        loader.add_css('evaluation_type', 'select#evaluation-type-select option[selected]::text')
        loader.add_css('ap_date', 'input.form-control[id="date-of-request"]::attr(value)')
        loader.add_css('ap_60_day_due_date', 'input.form-control[id="date-due"]::attr(value)')
        

        student_id = response.xpath('//label[contains(text(), "Student ID")]/following-sibling::div/label/text()').get()
        loader.add_value('family_id', student_id)
        # Extract comments
        self._extract_comments(response, loader)

        item = loader.load_item()

       
        
        # Check for PDF attachment
        link = response.xpath('//table[@id="signed-assessment-table"]//a/@href').get()
        pdf_url = None
        filename = None
        if link:
            pdf_url = link.split('file=')[-1] if 'file=' in link else None
            if pdf_url:
                self.logger.info(f"Found PDF URL: {pdf_url}")
                # Extract filename from URL after signed_assessment/
                filename = pdf_url.split('signed_assessment/')[-1]

            url = f'https://sped.fusionpl.us/students/student/{student_id}'
            if url:
                self.logger.info(f"Fetching student detail page: {url}")
                yield scrapy.Request(
                        url=url,
                        callback=self.parse_student_detail,
                        meta={'item': item, 'pdf_url': pdf_url, 'filename': filename},
                        priority=100,
                        dont_filter=True
                )
               
            else:
                if pdf_url:
                # Use Scrapy request instead of direct requests call
                    yield scrapy.Request(
                        url=pdf_url,
                        callback=self.handle_pdf_download,
                        meta={
                            'item': item,
                            'filename': filename
                        },
                        priority=10,
                        dont_filter=True
                    )
                else:
                    # Continue with the rest of your processing if no PDF URL
                    # item = loader.load_item()
                    yield item
    
    def _extract_comments(self, response, loader):
        """Extract comments from the assessment detail page"""
        comments = response.css('ul.chat-box.timeline li')
        
        comment_texts = []
        for comment in comments:
            content = comment.css('div.content blockquote span::text').get()
            if content:
                comment_texts.append(content)
        
        if comment_texts:
            # Append comments to existing notes
            existing_notes = loader.get_output_value('notes') or ''
            if existing_notes:
                existing_notes += ' | '
            
            loader.add_value('notes', existing_notes + ' | '.join(comment_texts))

    #----------------------
    # File handling methods
    #----------------------

    def handle_pdf_download(self, response):
        """Handle the PDF download and process it"""
        loader = CavaLoader(item=response.meta['item'], response=response)
        filename = response.meta['filename']
        
        try:
            # Save PDF to downloads directory
            file_path = self.file_helper.save_file_locally(response.body, filename)
            if not file_path:
                error_message = "Could not save PDF locally"
                self.logger.error(error_message)
                send_error_to_webhook(self.name, "downloading PDF", error_message)
                yield loader.load_item()
                return

            self.logger.info(f"PDF saved locally to: {file_path}")
            
            # Add district and school info
            loader.add_value('district', 'Cava Virtual Academy at Fresno')
            loader.add_value('school', 'Cava Virtual Academy at Fresno')
            
            item = loader.load_item()
            
            # Create Airtable record and send data to webhook
            yield from self.create_airtable_record_and_send_webhook(item, filename, file_path)

        except Exception as e:
            error_message = f"Error processing PDF: {str(e)}\n{traceback.format_exc()}"
            self.logger.error(f"Error processing PDF: {str(e)}")
            self.logger.error(traceback.format_exc())
            send_error_to_webhook(self.name, "processing PDF", error_message)
            yield loader.load_item()

    #----------------------
    # Integration methods
    #----------------------

    def create_airtable_record_and_send_webhook(self, item, filename, file_path):
        """Create Airtable record with student data and PDF, then send to webhook"""
        try:
            # Validate Airtable initialization
            if not self.airtable_helper.is_initialized():
                error_message = "Missing Airtable credentials. Cannot upload PDF."
                self.logger.error(error_message)
                send_error_to_webhook(self.name, "creating Airtable record", error_message)
                yield item
                return

            # Get student name 
            student_name = item.get('student_name')
            
            # Use first + last name if student_name is not available
            if not student_name and item.get('first_name') and item.get('last_name'):
                student_name = f"{item.get('first_name')} {item.get('last_name')}"
            
            if not student_name:
                self.logger.error("No student name available for Airtable record.")
                yield item
                return
                
            # Create a new Airtable record with minimal data
            self.logger.info(f"Creating Airtable record for student: {student_name}")
            record = self.airtable_helper.create_record("evals", {
                "Student Name": student_name,
                "Status": "Draft",
                "Auto Accepted": True
            })
            
            if not record or not record.get('id'):
                error_message = "Failed to create Airtable record, no ID returned"
                self.logger.error(error_message)
                send_error_to_webhook(self.name, "creating Airtable record", error_message)
                yield item
                return
                
            record_id = record.get('id')
            self.logger.info(f"Created Airtable record with ID: {record_id}")
            
            # Upload the PDF to the new record
            self.logger.info(f"Uploading PDF to Airtable record {record_id}")
            upload_result = self.airtable_helper.upload_attachment(
                "evals",
                record_id,
                "Files",
                file_path
            )
            
            if upload_result:
                self.logger.info(f"Successfully uploaded PDF to Airtable")
            else:
                self.logger.error(f"Failed to upload PDF to Airtable")
                
            # Now send the complete data to webhook with the record ID
            yield from self.send_data_to_webhook(item, record_id)
            
        except Exception as e:
            error_message = f"Error in create_airtable_record_and_send_webhook: {str(e)}\n{traceback.format_exc()}"
            self.logger.error(f"Error in create_airtable_record_and_send_webhook: {str(e)}")
            self.logger.error(traceback.format_exc())
            send_error_to_webhook(self.name, "creating Airtable record and sending webhook", error_message)
            yield item

    def send_data_to_webhook(self, item, record_id):
        """Send data to webhook including Airtable record ID"""
        try:
            # Create a loader to handle adding fields properly
            loader = CavaLoader(item=item)
            
            # Add the record ID to the item
            loader.add_value('airtable_record_id', record_id)
            
            # Get the updated item with Airtable record ID
            updated_item = loader.load_item()
            
            # Send data to webhook
            self.logger.info(f"Sending data to webhook with Airtable record ID: {record_id}")
            result = self.webhook_helper.send_data(dict(updated_item))
            
            if result:
                self.logger.info("Successfully sent data to webhook")
            else:
                self.logger.error("Failed to send data to webhook")
            
            # Return the updated item    
            yield updated_item
                
        except Exception as e:
            error_message = f"Error in send_data_to_webhook: {str(e)}\n{traceback.format_exc()}"
            self.logger.error(f"Error in send_data_to_webhook: {str(e)}")
            self.logger.error(traceback.format_exc())
            send_error_to_webhook(self.name, "sending data to webhook", error_message)
            
            # Return the original item if there's an error
            yield item