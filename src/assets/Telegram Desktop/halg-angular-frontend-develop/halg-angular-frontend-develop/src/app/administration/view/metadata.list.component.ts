import { Component, OnInit } from '@angular/core';
import {MegaMenuItem, MenuItem} from 'primeng/api';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';

@Component({
  selector: 'app-metadata.list',
  templateUrl: './metadata.list.component.html',
  styleUrls: ['./metadata.list.component.scss']
})
export class MetadataListComponent implements OnInit {


  breadcrumbItems: any[];
  demographicInfoManagement: any[];
  organisationUnitsManagement: any[];
  clinicalManagement: any[];
  hivEnrollment: any[];
  programs: any[];
  GeoLocation: any[];




  constructor(private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Administration', routerLink: ['/administration'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] }
  ]);
  }

  ngOnInit() {
    this.demographicInfoManagement = [
        {
            label: 'Basic Information',
            items: [
                {
                    label: 'Gender',
                    icon: 'pi pi-fw pi-user-edit',
                    routerLink: '/basicinfo/0'
                },
                {
                    label: 'Add/Manage Marital Status',
                    icon: 'pi pi-fw pi-user-edit',
                    routerLink: '/basicinfo/1'
                },{
                    label: 'Add/Manage Relationships',
                    icon: 'pi pi-fw pi-user-edit',
                    routerLink: '/basicinfo/2'
                },
                {
                    label: 'Add/Manage Language',
                    icon: 'pi pi-fw pi-user-edit',
                    routerLink: '/basicinfo/3'
                },
                {
                  label: 'Add/Manage Religion',
                  icon: 'pi pi-fw pi-user-edit',
                  routerLink: '/basicinfo/4'
              },
            ]
        },
        {
          label: 'Education',
          items: [
            {
              label: 'Add/Manage Occupation',
              icon: 'pi pi-fw pi-user-edit',
              routerLink: '/edu/0'
          },
          {
              label: 'Add/Manage Qualification',
              icon: 'pi pi-fw pi-user-edit',
              routerLink: '/edu/1'
          }

          ]
      },


    ];
    this.programs = [
      {
        label: 'Programs',
          items: [
              {
                  label: 'Add/Manage Programs',
                  icon: 'pi pi-fw pi-plus',
                  routerLink: '/programs/0'
              },
              {
                  label: 'Add/Manage Service Type',
                  icon: 'pi pi-fw pi-user-edit',
                  routerLink: '/programs/1'
              },
              {
                label: 'Add/Manage Implementing Partners',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/iPartners'
            },

            {
              label: 'Add/Manage Clinical Stage',
              icon: 'pi pi-fw pi-user-edit' ,
              routerLink: '/clinicalstageslist'
          },

          {
            label: 'Add/Manage Functional Status',
            icon: 'pi pi-fw pi-user-edit' ,
            routerLink: '/functionalstatuslist'
        },
          ]
          
      },
  ];


  this.GeoLocation = [
    {
      label: 'Geo Location',
        items: [
            {
                label: 'Add/Manage Nationality',
                icon: 'pi pi-fw pi-plus',
                routerLink: '/location/0',

            },
            {
                label: 'Add/Manage States',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/location/1',

            },
            {
              label: 'Add/Manage Local Government',
              icon: 'pi pi-fw pi-user-edit',
              routerLink: '/location/2'
          },
        ]
    },
];

    this.hivEnrollment = [
            {
                label:'Client Intake Form',
                items:[
                    {
                label: 'Add/Manage Target Group',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/cli-enrl/0'
            },
            {
                label: 'Add/Manage Care Entry Point',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/cli-enrl/1'
            },
            {
                label: 'Add/Manage Reffered From',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/cli-enrl/2'
            },
            {
                label: 'Add/Manage Enrollment Setting',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/enrollmensettingtlist'
            },
            {
              label: 'Add/Manage Disability',
              icon: 'pi pi-fw pi-user-edit',
              routerLink: '/cli-enrl/3'
          },
          {
            label: 'Add/Manage Pregnancy',
            icon: 'pi pi-fw pi-user-edit',
            routerLink: '/pregnancylist'
        },
        {
          label: 'Add/Manage Client Type',
          icon: 'pi pi-fw pi-user-edit',
          routerLink: '/client-typelist'
      }

          ]

      },
       {
        label: 'Hiv Enrollment',
        items: [
          {
        label: 'Add/Manage Prior Art ',
        icon: 'pi pi-fw pi-user-edit',
        routerLink: '/hiv-enrl/0'
          },
          {
            label: 'Add/Manage Mode Of Hiv Test',
            icon: 'pi pi-fw pi-user-edit',
            routerLink: '/hiv-enrl/1'
              }
        ]
    },
  ];
  this.organisationUnitsManagement = [
    {
        items: [
            {
                label: 'Add/Manage Heirarchy',
                icon: 'pi pi-fw pi-plus',
                routerLink: '/heirarchylist'
            },
            {
                label: 'Add/Manage Heirarchy Units',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/heirarchyunitlist'
            },
            {
                label: 'Add/Manage Heirarchy Groups',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/heirarchygroups'
            },
            {
                label: 'Add/Manage Facility Name',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/facilitynamelist'
            },
            {
                label: 'Add/Manage Facility Type',
                icon: 'pi pi-fw pi-user-edit',
                routerLink: '/facilitytypelist'
            }
        ]
    },
];
this.clinicalManagement = [
  {
      items: [
          {
              label: 'Add/Manage Allergies',
              icon: 'pi pi-fw pi-plus',
              routerLink: '/clinical/0'
          },
          {
              label: 'Add/Manage Laboratories',
              icon: 'pi pi-fw pi-user-edit',
              routerLink: '/laboratorieslist'
          },
          {
              label: 'Add/Manage Pharmacies',
              icon: 'pi pi-fw pi-user-edit',
              routerLink: '/pharmacieslist'
          },
          {
            label: 'Add/Manage Allergens',
            icon: 'pi pi-fw pi-user-edit',
            routerLink: '/clinical/1'
        },
        {
            label: 'Add/Manage Severity',
            icon: 'pi pi-fw pi-user-edit',
            routerLink: '/clinical/2'
        },
        {
          label: 'Add/Manage Priority',
          icon: 'pi pi-fw pi-user-edit',
          routerLink: '/clinical/3'
      }
      ]
  },
  {
    label: 'Laboratory Test Data',
    items: [
      {
        label: 'Add/Manage Laboratory Test Type',
        icon: 'pi pi-fw pi-user-edit',
        routerLink: '/laboratory/0'
    },
    {
        label: 'Add/Manage Laboratory Test',
        icon: 'pi pi-fw pi-user-edit',
        routerLink: '/laboratory/1'
    },
    {
      label: 'Add/Manage Specimen Type',
      icon: 'pi pi-fw pi-user-edit',
      routerLink: '/specimen/0'
  },
  {
    label: 'Add/Manage Specimen Collection Mode',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/specimen/1'
},
{
  label: 'Add/Manage Confirm Sample',
  icon: 'pi pi-fw pi-user-edit',
  routerLink: '/cfsample'
},
    {
        label: 'Add/Manage Status Type',
        icon: 'pi pi-fw pi-user-edit',
        routerLink: '/status/0'
    },
    {
        label: 'Add/Manage Status',
        icon: 'pi pi-fw pi-user-edit',
        routerLink: '/status/1'
    },

    {
      label: 'Add/Manage Art Status',
      icon: 'pi pi-fw pi-user-edit',
      routerLink: '/artstatuslist'
  },
  {
    label: 'Add/Manage Opportunistic Infections',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/oppinfectionslist'
},
{
  label: 'Add/Manage Level of Adherence',
  icon: 'pi pi-fw pi-user-edit',
  routerLink: '/levelofadherencelist'
}

    ]
},
{
  label: 'Assessments',
  items: [
    {
      label: 'Add/Manage Assessment Type',
      icon: 'pi pi-fw pi-user-edit',
      routerLink: '/assessment/0'
  },
  {
      label: 'Add/Manage Assessment Questions',
      icon: 'pi pi-fw pi-user-edit',
      routerLink: '/assessment/1'
  }

  ]
},
{
  label: 'Pharmacy',
  items: [
    {
      label: 'Add/Manage Drug',
      icon: 'pi pi-fw pi-user-edit',
      routerLink: '/pharm/0'
  },
  {
    label: 'Add/Manage Drug Frequency',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/pharm/1'
  },
  {
    label: 'Add/Manage Unit',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/pharm/2'
  },
  {
    label: 'Add/Manage Medication Line',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/pharm/3'
  },
  {
    label: 'Add/Manage Regimen Combination',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/pharm/4'
  },
  {
    label: 'Add/Manage Dose',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/doselist'
},
  {
      label: 'Add/Manage Strength',
      icon: 'pi pi-fw pi-user-edit',
      routerLink: '/strengthlist'
  },

  {
    label: 'Add/Manage Dispensing Pattern',
    icon: 'pi pi-fw pi-user-edit',
    routerLink: '/dispensingpatternlist'
},
{
label: 'Add/Manage Condition',
icon: 'pi pi-fw pi-user-edit',
routerLink: '/diagnosisconditionlist'
}
,]
},

];
  }

}
