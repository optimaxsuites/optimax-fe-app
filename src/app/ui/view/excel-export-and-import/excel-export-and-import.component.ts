import { Component, EventEmitter, OnInit, Output } from '@angular/core';
// import * as ExcelJS from "exceljs"
import { Column, Row, Workbook } from 'exceljs';
import { ProductExcelColumns } from '../../models/enums';
import { PosServiceService } from '../../service/pos-service.service';
import { DiscountDTO, ProductCategoryDTO } from '../../models/interface';

@Component({
  selector: 'app-excel-export-and-import',
  templateUrl: './excel-export-and-import.component.html',
  styleUrls: [],
})
export class ExcelExportAndImportComponent implements OnInit {
  @Output() fileUploaded = new EventEmitter<File>();
  @Output() close = new EventEmitter<false>();

  private categoryNames: string[] = ['Food', 'Medicine'];
  private discountNames: string[] = ['Black Friday', '10%'];
  private branchNames: string[] = ['Wuse', 'HQ'];

  constructor(private posService: PosServiceService) {}

  ngOnInit(): void {
    // Fetch the required data
    this.posService
      .getCategories()
      .subscribe(async (data: ProductCategoryDTO[]) => {
        try {
          this.categoryNames = structuredClone(data).map((category) => {
            return category.name;
          });
        } catch (error) {
          console.log('Error fetching categories:', error);
        }
      });

    this.posService.getDiscount().subscribe(async (data: DiscountDTO[]) => {
      try {
        this.discountNames = structuredClone(data).map((discount) => {
          return discount.name;
        });
      } catch (error) {
        console.log('Error fetching discounts:', error);
      }
    });

    // TODO: Get a *proper* way to fetch the branches. No, I will not fetch the products and check for the branches :p
    console.warn('CANNOT FETCH BRANCHES, DEFAULTING TO DEFAULT DATA!');
  }

  async generateExcelTemplate() {
    const MAX_RANGE = 110;
    const STARTING_INDEX = 1; // NOTE: The index starts at 1 instead of 0!

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Products to Add', {
      properties: { tabColor: { argb: 'FFC0000' } },
    });

    const applyCellAlignmentToRow = (
      row: Row,
      startIndex = STARTING_INDEX,
      maxRange = MAX_RANGE
    ) => {
      for (let i = startIndex; i <= maxRange; i++) {
        const cell = row.getCell(i);
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      }
    };
    // REVIEW: I could probably merge these two functions together
    const applyBorderToRow = (
      row: Row,
      startIndex = STARTING_INDEX,
      maxRange = MAX_RANGE
    ) => {
      for (let i = startIndex; i <= maxRange; i++) {
        const cell = row.getCell(i);
        cell.border = {
          top: { style: 'thick' },
          right: { style: 'thick' },
          bottom: { style: 'thick' },
          left: { style: 'thick' },
        };
      }
    };
    const increaseCellWidthOfColumn = (
      columnIndexes: ProductExcelColumns[],
      rowToGetCells: Row
    ) => {
      columnIndexes.forEach((columnIndex) => {
        const index = columnIndex + 1;
        const column = worksheet.getColumn(index);
        const cellWidth = rowToGetCells.getCell(index).text.length + 2;

        column.width =
          (column.width ?? 0) < cellWidth ? cellWidth : column.width;
      });
    };

    // This stores the a row of values to serve as the first row in the spreadsheet
    const headers: string[] = [];
    headers[ProductExcelColumns.NAME] = 'Name';
    headers[ProductExcelColumns.DESCRIPTION] = 'Description';
    // headers[ProductExcelColumns.IMAGE_URL] = 'Image URL';
    headers[ProductExcelColumns.BRANCH] = 'Branch';
    headers[ProductExcelColumns.CODE] = 'Code';
    headers[ProductExcelColumns.BASE_PRICE] = 'Base Price';
    headers[ProductExcelColumns.TAX_PERCENTAGE] = 'Tax (%)';
    // headers[ProductExcelColumns.DISCOUNT_PERCENTAGE] = 'Discount (%)';
    headers[ProductExcelColumns.DISCOUNT_NAME] = 'Discount Name';
    // headers[ProductExcelColumns.DISCOUNT_TYPE] = 'Discount Type';
    headers[ProductExcelColumns.QUANTITY] = 'Quantity';
    headers[ProductExcelColumns.SKU] = 'SKU';
    headers[ProductExcelColumns.PART_NUMBER] = 'Part Number';
    headers[ProductExcelColumns.CATEGORY] = 'Category';
    headers[ProductExcelColumns.VARIANTS] = 'Variant(s) (comma seperated)';
    headers[ProductExcelColumns.ITEM_WEIGHT] = 'Item Weight (in grams)';

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    applyCellAlignmentToRow(headerRow, undefined, ProductExcelColumns.END);
    applyBorderToRow(headerRow, undefined, ProductExcelColumns.END);

    // This is just to show the user how to fill in the data
    const sampleInfo: (string | number)[] = [];
    sampleInfo[ProductExcelColumns.NAME] = 'Dummy Product';
    sampleInfo[ProductExcelColumns.DESCRIPTION] =
      'The Dummy Product does everything out of the box!';
    // sampleInfo[ProductExcelColumns.IMAGE_URL] = ''; // TODO: Figure out how images should be added.
    sampleInfo[ProductExcelColumns.BRANCH] = ''; // TODO: Fetch these from somewhere
    sampleInfo[ProductExcelColumns.CODE] = 1500;
    sampleInfo[ProductExcelColumns.BASE_PRICE] = 1200;
    sampleInfo[ProductExcelColumns.TAX_PERCENTAGE] = 10;
    // sampleInfo[ProductExcelColumns.DISCOUNT_PERCENTAGE] = 0
    sampleInfo[ProductExcelColumns.DISCOUNT_NAME] = '';
    // sampleInfo[ProductExcelColumns.DISCOUNT_TYPE] = ;
    sampleInfo[ProductExcelColumns.QUANTITY] = 55;
    sampleInfo[ProductExcelColumns.SKU] = 1500;
    sampleInfo[ProductExcelColumns.PART_NUMBER] = 1500;
    sampleInfo[ProductExcelColumns.CATEGORY] = ''; // TODO:
    sampleInfo[ProductExcelColumns.VARIANTS] = 'Blue, Red, Yellow';
    sampleInfo[ProductExcelColumns.ITEM_WEIGHT] = 300;

    const sampleInfoRow = worksheet.addRow(sampleInfo);
    // for (let i = STARTING_INDEX; i < ProductExcelColumns.END; i++) {
    //   const cell = sampleInfoRow.getCell(i);

    //   cell.model.comment = {
    //     texts: [{ text: 'Make sure to delete this Dummy Data!' }],
    //   };
    // }

    const stringArrayToXlsxFormulae = (arr: string[]) => {
      return [`"${arr.join(',')}"`];
    };

    for (let i = STARTING_INDEX + 1; i < MAX_RANGE; i++) {
      const row = worksheet.getRow(i);
      const branchCell = row.getCell(ProductExcelColumns.BRANCH + 1);
      const discountNameCell = row.getCell(
        ProductExcelColumns.DISCOUNT_NAME + 1
      );
      const categoryCell = row.getCell(ProductExcelColumns.CATEGORY + 1);

      branchCell.dataValidation = {
        formulae: stringArrayToXlsxFormulae(this.branchNames),
        type: 'list',
        allowBlank: false,
      };
      discountNameCell.dataValidation = {
        formulae: stringArrayToXlsxFormulae(this.discountNames),
        type: 'list',
        allowBlank: true,
      };
      categoryCell.dataValidation = {
        formulae: stringArrayToXlsxFormulae(this.categoryNames),
        type: 'list',
        allowBlank: false,
      };

      applyCellAlignmentToRow(row, undefined, ProductExcelColumns.END);

      // REVIEW: I'm running it using both rows to ensure that each column is wide enough
      for (let j = 1; j <= 2; j++) {
        increaseCellWidthOfColumn(
          (() => {
            let i = ProductExcelColumns.START;
            const returnArr: ProductExcelColumns[] = [];
            while (i < ProductExcelColumns.END) {
              returnArr.push(i);
              i++;
            }
            return returnArr;
          })(),
          worksheet.getRow(j)
        );
      }
    }

    return workbook;
  }

  async downloadTemplate() {
    const template = await this.generateExcelTemplate();
    // console.log(template);

    try {
      // await template.xlsx.writeFile('product-template.xlsx');
      const buffer = await template.xlsx.writeBuffer();
      const xlsxBlob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const templateUrl = URL.createObjectURL(xlsxBlob);
      const link = document.createElement('a');
      link.href = templateUrl;
      link.download = 'product-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error writing file: ', error);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      this.fileUploaded.emit(file);
    }
  }
  closeModal() {
    this.close.emit(false);
  }
}
