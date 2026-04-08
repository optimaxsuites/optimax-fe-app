import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { VendorDto } from '../domain/vendor.dto';
import { environment } from '../sharedComponent/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MailerServiceService {
  private readonly mailEndpoint = environment.optimaxMailEndpoint;

  constructor(private http: HttpClient) {}

  sendMail(body: {
    name: string;
    recieverEmail: string;
    subject: string;
    body: string;
  }): Observable<any> {
    return this.http
      .post<any>(this.mailEndpoint, body, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'x-api-key': environment.optimaxApiKey,
        }),
      })
      .pipe(
        catchError((error) => {
          console.error('Email failed', error);
          return throwError(() => error);
        }),
      );
  }

  sendVendorApprovalEmail(vendor: VendorDto): Observable<any> {
    return this.sendMail({
      name: vendor.companyProfile.legalName,
      recieverEmail: vendor.companyProfile.companyEmail,
      subject: 'Vendor Registration Approved',
      body: `Hello ${vendor.companyProfile.legalName},

        We are pleased to inform you that your vendor registration has been approved.

        You can now log in to the vendor portal and participate in procurement activities, including viewing relevant purchase requisitions and submitting quotes.

        Regards,
        Procurement Team`,
    });
  }

  sendVendorRejectionEmail(
    vendor: VendorDto,
    rejectionReason?: string,
  ): Observable<any> {
    return this.sendMail({
      name: vendor.companyProfile.legalName,
      recieverEmail: vendor.companyProfile.companyEmail,
      subject: 'Vendor Registration Update',
      body: `Hello ${vendor.companyProfile.legalName},

        Thank you for your interest in registering as a vendor.

        After review, we are unable to approve your registration at this time.${
                rejectionReason
                  ? `
        Reason:
        ${rejectionReason}`
                  : ''
      }

        You may review your submission and make corrections where necessary.

        Regards,
        Procurement Team`,
    });
  }

  sendQuoteApprovedEmail(params: {
    vendorName: string;
    recieverEmail: string;
    prmNo: string;
    quoteReference?: string;
  }): Observable<any> {
    return this.sendMail({
      name: params.vendorName,
      recieverEmail: params.recieverEmail,
      subject: `Quote Approved - ${params.prmNo}`,
      body: `Hello ${params.vendorName},

        We are pleased to inform you that your quote for purchase requisition ${
                params.prmNo
              } has been approved.${
                params.quoteReference
                  ? `

        Quote Reference:
        ${params.quoteReference}`
                  : ''
              }

        Our procurement team may contact you with the next steps.

        Regards,
        Procurement Team`,
            });
  }

  sendQuoteRejectedEmail(params: {
    vendorName: string;
    recieverEmail: string;
    prmNo: string;
    rejectionReason?: string;
    quoteReference?: string;
  }): Observable<any> {
    return this.sendMail({
      name: params.vendorName,
      recieverEmail: params.recieverEmail,
      subject: `Quote Update - ${params.prmNo}`,
      body: `Hello ${params.vendorName},

        Thank you for submitting your quote for purchase requisition ${params.prmNo}.

        After review, your quote was not selected.${
                params.quoteReference
                  ? `

        Quote Reference:
        ${params.quoteReference}`
                  : ''
              }${
                params.rejectionReason
                  ? `

        Reason:
        ${params.rejectionReason}`
                  : ''
              }

        We appreciate your participation and look forward to future opportunities.

        Regards,
        Procurement Team`,
            });
  }

  sendPrInvitationEmail(params: {
  vendorName: string;
  recieverEmail: string;
  prmNo: string;
  prTitle: string;
  departmentName?: string;
  requiredByDate?: string;
}): Observable<any> {
  return this.sendMail({
    name: params.vendorName,
    recieverEmail: params.recieverEmail,
    subject: `Invitation to Quote - ${params.prmNo}`,
    body: `Hello ${params.vendorName},

You have been invited to submit a quote for a new purchase requisition.

PRM No: ${params.prmNo}
Title: ${params.prTitle}
Department: ${params.departmentName || '---'}
Required By: ${params.requiredByDate || '---'}

Please log in to the vendor portal to review the requisition details and submit your quote before the deadline.

Regards,
Procurement Team`,
  });
}
}
