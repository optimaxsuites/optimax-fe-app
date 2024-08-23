import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { RandomTokenService } from '../../shared/service/random-token/random-token.service';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PosServiceService {
  constructor(private randomTokenService: RandomTokenService, private http: HttpClient, private navigationLink: NavigationLinksService, private router: Router){}
  
 products =[
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops",
    price: 109.95,
    cartPriceTotal: 109.95,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Your perfect pack for everyday use and walks in the forest. Stash your laptop (up to 15 inches) in the padded sleeve, your everyday",
    category: "men's clothing",
    image: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg",
    rating: {
      rate: 3.9,
      count: 120
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Mens Casual Premium Slim Fit T-Shirts",
    price: 22.3,
    cartPriceTotal: 22.3,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Slim-fitting style, contrast raglan long sleeve, three-button henley placket, light weight & soft fabric for breathable and comfortable wearing. And Solid stitched shirts with round neck made for durability and a great fit for casual fashion wear and diehard baseball fans. The Henley style round neckline includes a three-button placket.",
    category: "men's clothing",
    image: "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg",
    rating: {
      rate: 4.1,
      count: 259
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Mens Cotton Jacket",
    price: 55.99,
    cartPriceTotal: 55.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Great outerwear jackets for Spring/Autumn/Winter, suitable for many occasions, such as working, hiking, camping, mountain/rock climbing, cycling, traveling or other outdoors. Good gift choice for you or your family member. A warm hearted love to Father, husband or son in this thanksgiving or Christmas Day.",
    category: "men's clothing",
    image: "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_.jpg",
    rating: {
      rate: 4.7,
      count: 500
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Mens Casual Slim Fit",
    price: 15.99,
    cartPriceTotal: 15.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "The color could be slightly different between on the screen and in practice. / Please note that body builds vary by person, therefore, detailed size information should be reviewed below on the product description.",
    category: "men's clothing",
    image: "https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg",
    rating: {
      rate: 2.1,
      count: 430
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
    price: 695,
    cartPriceTotal: 695,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "From our Legends Collection, the Naga was inspired by the mythical water dragon that protects the ocean's pearl. Wear facing inward to be bestowed with love and abundance, or outward for protection.",
    category: "jewelery",
    image: "https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_.jpg",
    rating: {
      rate: 4.6,
      count: 400
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Solid Gold Petite Micropave",
    price: 168,
    cartPriceTotal: 168,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Satisfaction Guaranteed. Return or exchange any order within 30 days.Designed and sold by Hafeez Center in the United States. Satisfaction Guaranteed. Return or exchange any order within 30 days.",
    category: "jewelery",
    image: "https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_.jpg",
    rating: {
      rate: 3.9,
      count: 70
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "White Gold Plated Princess",
    price: 9.99,
    cartPriceTotal: 9.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Classic Created Wedding Engagement Solitaire Diamond Promise Ring for Her. Gifts to spoil your love more for Engagement, Wedding, Anniversary, Valentine's Day...",
    category: "jewelery",
    image: "https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg",
    rating: {
      rate: 3,
      count: 400
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Pierced Owl Rose Gold Plated Stainless Steel Double",
    price: 10.99,
    cartPriceTotal: 10.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Rose Gold Plated Double Flared Tunnel Plug Earrings. Made of 316L Stainless Steel",
    category: "jewelery",
    image: "https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_.jpg",
    rating: {
      rate: 1.9,
      count: 100
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "WD 2TB Elements Portable External Hard Drive - USB 3.0",
    price: 64,
    cartPriceTotal: 64,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "USB 3.0 and USB 2.0 Compatibility Fast data transfers Improve PC Performance High Capacity; Compatibility Formatted NTFS for Windows 10, Windows 8.1, Windows 7; Reformatting may be required for other operating systems; Compatibility may vary depending on user’s hardware configuration and operating system",
    category: "electronics",
    image: "https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_.jpg",
    rating: {
      rate: 3.3,
      count: 203
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "SanDisk SSD PLUS 1TB Internal SSD - SATA III 6 Gb/s",
    price: 109,
    cartPriceTotal: 109,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Easy upgrade for faster boot up, shutdown, application load and response (As compared to 5400 RPM SATA 2.5” hard drive; Based on published specifications and internal benchmarking tests using PCMark vantage scores) Boosts burst write performance, making it ideal for typical PC workloads The perfect balance of performance and reliability Read/write speeds of up to 535MB/s/450MB/s (Based on internal testing; Performance may vary depending upon drive capacity, host device, OS and application.)",
    category: "electronics",
    image: "https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_.jpg",
    rating: {
      rate: 2.9,
      count: 470
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Silicon Power 256GB SSD 3D NAND A55 SLC Cache Performance Boost SATA III 2.5",
    price: 109,
    cartPriceTotal: 109,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "3D NAND flash are applied to deliver high transfer speeds Remarkable transfer speeds that enable faster bootup and improved overall system performance. The advanced SLC Cache Technology allows performance boost and longer lifespan 7mm slim design suitable for Ultrabooks and Ultra-slim notebooks. Supports TRIM command, Garbage Collection technology, RAID, and ECC (Error Checking & Correction) to provide the optimized performance and enhanced reliability.",
    category: "electronics",
    image: "https://fakestoreapi.com/img/71kWymZ+c+L._AC_SX679_.jpg",
    rating: {
      rate: 4.8,
      count: 319
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive",
    price: 114,
    cartPriceTotal: 114,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Expand your PS4 gaming experience, Play anywhere Fast and easy, setup Sleek design with high capacity, 3-year manufacturer's limited warranty",
    category: "electronics",
    image: "https://fakestoreapi.com/img/61mtL65D4cL._AC_SX679_.jpg",
    rating: {
      rate: 4.8,
      count: 400
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Acer SB220Q bi 21.5 inches Full HD (1920 x 1080) IPS Ultra-Thin",
    price: 599,
    cartPriceTotal: 599,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "21. 5 inches Full HD (1920 x 1080) widescreen IPS display And Radeon free Sync technology. No compatibility for VESA Mount Refresh Rate: 75Hz - Using HDMI port Zero-frame design | Ultra-thin | 4ms response time | IPS panel Aspect ratio - 16:9. Voltage - 100-240V 60Hz. Tiltable display -5 to 15 degrees. Horizontal Viewing Angle-178 degree. Vertical Viewing Angle-178 degree 75 hertz",
    category: "electronics",
    image: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_.jpg",
    rating: {
      rate: 2.9,
      count: 250
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Samsung 49-Inch CHG90 144Hz Curved Gaming Monitor (LC49HG90DMNXZA) – Super Ultrawide Screen QLED ",
    price: 999.99,
    cartPriceTotal: 999.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "49 INCH SUPER ULTRAWIDE 32:9 CURVED GAMING MONITOR with dual 27 inch screen side by side QUANTUM DOT (QLED) TECHNOLOGY, HDR support and factory calibration, ensuring vibrant and accurate color and contrast ONE HDMI, TWO USB, AND TWO DISPLAYPORTS",
    category: "electronics",
    image: "https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_.jpg",
    rating: {
      rate: 2.2,
      count: 140
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket Winter Coats",
    price: 56.99,
    cartPriceTotal: 56.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Note:The Jackets is US standard size, Please choose size as your usual wear Material: 100% Polyester; Detachable Liner Fabric: Warm Fleece. Hooded Softshell is Highly Wind Resistant and Warm.",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_.jpg",
    rating: {
      rate: 2.6,
      count: 235
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Lock and Love Women's Removable Hooded Faux Leather Moto Biker Jacket",
    price: 29.95,
    cartPriceTotal: 29.95,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "100% POLYURETHANE (shell) 100% POLYESTER (lining) Imported Zipper closure Hand Wash Only Removable hooded faux leather moto jacket Our jacket is made of eco-friendly faux leather with an asymmetrical zipper closure for a chic look and smooth touch. It has a removable hood that offers versatility and extra warmth for cooler days.",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/81XH0e8fefL._AC_UY879_.jpg",
    rating: {
      rate: 2.9,
      count: 340
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Rain Jacket Women Windbreaker Striped Climbing Raincoats",
    price: 39.99,
    cartPriceTotal: 39.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "Lightweight perfect for trip or casual wear---Long sleeve with hooded, adjustable drawstring waist design. Buttons and zipper front closure raincoat, fully stripes Lined and adjustable drawstring hood design.",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2.jpg",
    rating: {
      rate: 3.8,
      count: 679
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "MBJ Women's Solid Short Sleeve Boat Neck V ",
    price: 9.85,
    cartPriceTotal: 9.85,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "95% RAYON 5% SPANDEX Imported Pull On closure Lightweight fabric with great stretch for comfort Ribbed on sleeves and neckline / Double stitching on bottom hem",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_.jpg",
    rating: {
      rate: 4.7,
      count: 130
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "Opna Women's Short Sleeve Moisture",
    price: 7.95,
    cartPriceTotal: 7.95,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "100% Polyester Moisture wicking fabric, crew neckline, soft lightweight material. Keeps you cool and dry throughout your workout or casual wear. Tag-free label for added comfort, Double-needle stitching in sleeves and bottom hem for extra durability, Contrast color side panels, Available in a variety of colors in plus size.",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/51eg55uWmdL._AC_UX679_.jpg",
    rating: {
      rate: 4.5,
      count: 146
    }
  },
  {
    id: this.randomTokenService.getRandomToken(),
    name: "DANVOUY Womens T Shirt Casual Cotton Short",
    price: 12.99,
    cartPriceTotal: 12.99,
    count: 0,
    discount: 0.00,
    discountType: "naira",
    discountValue: 0,
    description: "95%Cotton,5%Spandex Made in USA or Imported Pull On closure Machine Wash Casual, short sleeve, soft and comfortable wear The fabric is very soft and stretchy, which makes it light and ideal for summer weather. The prints are of high quality and will not fade after washing. Perfect for shorts, jeans, or leggings. Great for casual, daily, and summer wear.",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/61pHAEJ4NML._AC_UX679_.jpg",
    rating: {
      rate: 3.6,
      count: 145
    }
  }
];
private getBaseApiUrl(): string {
  return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
}
addCategory(data: any){
  return this.http
  .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/productCategories", data)
  .pipe(catchError(this.handleError));
}

getCategories(){
  return this.http
  .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/productCategories")
  .pipe(catchError(this.handleError));
}

deleteCategory(id: number){
  return this.http
  .delete<any>(this.getBaseApiUrl() + `/x/api/v2/pos/productCategories/${id}`)
  .pipe(catchError(this.handleError));
}

addProduct(data: any){
  return this.http
  .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/products/product", data)
  .pipe(catchError(this.handleError));
}

getProducts(){
  return this.http
  .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/products")
  .pipe(catchError(this.handleError));
}

updateProduct(id:number, data:any){
  return this.http
  .put<any>(this.getBaseApiUrl() + `/x/api/v2/pos/products/${id}`, data)
  .pipe(catchError(this.handleError));
}

deleteProduct(id: number){
  return this.http
  .delete<any>(this.getBaseApiUrl() + `/x/api/v2/pos/products/${id}`)
  .pipe(catchError(this.handleError));
}

getProductImage(filename: string){
  return this.getBaseApiUrl() + `/x/api/v2/pos/products/images/${filename}.png`
}

getDiscountTypes(){
  return this.http
  .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/discountTypes")
  .pipe(catchError(this.handleError));
}

private handleError(error: HttpErrorResponse) {
  let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 500) {
        errorMessage = 'Server error: ' + error.error.message || 'Check form details and try again.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found. Please try again.';
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.error.message || 'An unexpected error occurred.';
      }
    }
    return throwError(() => errorMessage);
}
  
}


