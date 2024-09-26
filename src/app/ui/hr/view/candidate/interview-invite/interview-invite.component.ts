import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-interview-invite',
  templateUrl: './interview-invite.component.html',
  styleUrl: './interview-invite.component.scss'
})
export class InterviewInviteComponent {
  @Output() back = new EventEmitter<void>();
  @Input() candidate: any;

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.setTemplate(0)
  }

  // Method to trigger back button event
  goBack() {
    this.back.emit();
  }


  templates: string[] = [
    `Dear [Candidate Name],

We are pleased to inform you that you have been shortlisted for an interview for the position of [Job Title] at [Company Name].

Interview Details:

Date: [Interview Date]
Time: [Interview Time]
Location: [Interview Location] / [Online Meeting Link]
Interview Type: [In-person/Virtual]

Please let us know if the scheduled time works for you or if you need to reschedule.

If the interview is virtual, kindly ensure you have a stable internet connection and the necessary software installed. Attached are instructions for joining the online meeting.

We look forward to speaking with you and learning more about your qualifications.

Best regards,
[Your Name]
[Your Job Title]
[Company Name]
[Contact Information]`,

    `Dear [Candidate Name],

We are excited to invite you to an interview for the position of [Job Title] at [Company Name]. Your application has impressed us, and we are eager to learn more about you.

Interview Details:

Date: [Interview Date]
Time: [Interview Time]
Location: [Interview Location] / [Online Meeting Link]
Interview Format: [In-person/Virtual]
Duration: [Estimated Interview Duration]

Please confirm your availability for this date and time. If you are unable to attend, let us know as soon as possible, and we will do our best to accommodate a rescheduled interview.

If this is a virtual interview, please ensure your setup includes a quiet environment and a reliable internet connection. Further instructions will be provided in a follow-up email.

We look forward to speaking with you soon!

Best regards,
[Your Name]
[Your Job Title]
[Company Name]
[Contact Information]`,

    `Hi [Candidate Name],

Great news! We’d love to get to know you better and chat about the [Job Title] role at [Company Name]. Your application stood out, and we think you could be a great fit for the team.

Here are the interview details:

Date: [Interview Date]
Time: [Interview Time]
Location: [Interview Location] / [Online Meeting Link]
Interview Style: [In-person/Virtual]

We’re excited to hear more about your experience and what you’d bring to the team. If the time doesn’t work for you, no worries! Just let us know, and we’ll find another time that suits you.

For virtual interviews, make sure you’re in a quiet space with a good internet connection. We’ll send any necessary links and instructions ahead of time.

Looking forward to our chat!

Best,
[Your Name]
[Your Job Title]
[Company Name]
[Contact Information] `
  ];

  activeTemplateIndex: number | null = null;
  selectedTemplate: string = '';
  processedTemplate: string = '';

  // Function to replace placeholders with actual data
  replacePlaceholders(template: string, candidate: any): string {
    return template
      .replace(/\[Candidate Name\]/g, candidate.candidate)
      .replace(/\[Job Title\]/g, candidate.position)
      .replace(/\[Company Name\]/g, 'Centrifuge Info Tech'); // You can dynamically set company name if needed
  }

  // Call this when initializing or changing template
  setTemplate(templateIndex: number) {
    if (this.candidate) {
      this.selectedTemplate = this.templates[templateIndex];
      this.processedTemplate = this.replacePlaceholders(this.selectedTemplate, this.candidate);
      this.activeTemplateIndex = templateIndex;
    }
  }
  // This function is called when the textarea is edited
  onTemplateEdit(newTemplate: string) {
    this.processedTemplate = newTemplate; // Update processed template with user edits
  }

  getTemplateName(index: number): string {
    const templateNames = [
      'Formal Invitation Template',
      'Excited Invitation Template',
      'Casual Chat Invitation Template'
    ];
    return templateNames[index];
  }


  sendInvite() {
    const email = 'psimeon360@gmail.com';
    const subject = 'Interview Invitation';
    const body = encodeURIComponent(this.processedTemplate); // Encode the body for URL
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

    // Use window.location to open the mail client
    window.location.href = mailtoLink;

    // Optionally, you can also display a success message or handle errors here
    alert('Invite sent to ' + email);
  }
}
