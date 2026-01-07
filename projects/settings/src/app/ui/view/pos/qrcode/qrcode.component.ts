import { Component, OnInit } from '@angular/core';
import QRCode from 'qrcode';
import { v4 as uuidV4 } from 'uuid';

const SVG_CIRCLES = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect fill="%23ffffff" width="600" height="600"/><circle cx="108" cy="104" r="165" fill="%23FFEDD5" opacity="0.8"/><circle cx="493" cy="462" r="136" fill="%23DBEAFE" opacity="0.8"/><circle cx="508" cy="140" r="85" fill="%23FCE7F3" opacity="0.9"/><circle cx="184" cy="478" r="103" fill="%23D1FAE5" opacity="0.9"/><circle cx="300" cy="300" r="80" fill="%23E0E7FF" opacity="0.6"/></svg>';

const SVG_WAVES = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%2306b6d4"/><stop offset="1" stop-color="%233b82f6"/></linearGradient></defs><rect fill="%23ffffff" width="600" height="600"/><path fill="url(%23a)" fill-opacity="0.2" d="M0,192L48,208C96,224,192,256,288,266.7C384,277,480,267,528,261.3L576,256L576,600L528,600C480,600,384,600,288,600C192,600,96,600,48,600L0,600Z"/><path fill="url(%23a)" fill-opacity="0.4" d="M0,320L48,336C96,352,192,384,288,394.7C384,405,480,395,528,389.3L576,384L576,600L528,600C480,600,384,600,288,600C192,600,96,600,48,600L0,600Z"/></svg>';

const SVG_GEOMETRIC = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect fill="%231f2937" width="600" height="600"/><path fill="%23374151" d="M0,0L600,0L600,600L0,600L0,0ZM50,50L550,50L550,550L50,550L50,50ZM100,100L500,100L500,500L100,500L100,100ZM150,150L450,150L450,450L150,450L150,150Z" opacity="0.3"/><path stroke="%234b5563" stroke-width="2" d="M0,0L600,600M600,0L0,600" opacity="0.2"/></svg>';

const SVG_SUNRISE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23fcd34d"/><stop offset="1" stop-color="%23f43f5e"/></linearGradient></defs><rect width="600" height="600" fill="url(%23g)"/><path d="M0 600 Q 150 450 300 600 T 600 600" fill="white" fill-opacity="0.2"/></svg>';

const SVG_CIRCUIT = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="%230f172a"/><path d="M0 100h200v200h-200z M400 300h200v200h-200z" fill="none" stroke="%23334155" stroke-width="2"/><circle cx="200" cy="100" r="5" fill="%2338bdf8"/><circle cx="400" cy="500" r="5" fill="%2338bdf8"/><path d="M0 0l600 600M600 0L0 600" stroke="%231e293b" stroke-width="1"/></svg>';

const SVG_CONFETTI = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="%23fdfaf2"/><g opacity="0.8"><rect x="50" y="80" width="15" height="8" fill="%23fbbf24" transform="rotate(20 50 80)"/><rect x="250" y="30" width="12" height="20" fill="%23fbbf24" transform="rotate(-15 250 30)"/><rect x="520" y="120" width="18" height="10" fill="%23fbbf24" transform="rotate(45 520 120)"/><rect x="180" y="520" width="20" height="8" fill="%23fbbf24" transform="rotate(10 180 520)"/><rect x="420" y="450" width="15" height="15" fill="%23fbbf24" transform="rotate(30 420 450)"/><circle cx="120" cy="150" r="8" fill="%2360a5fa"/><circle cx="480" cy="80" r="10" fill="%2360a5fa"/><circle cx="330" cy="510" r="7" fill="%2360a5fa"/><circle cx="50" cy="400" r="9" fill="%2360a5fa"/><circle cx="550" cy="320" r="11" fill="%2360a5fa"/><path d="M400,100 l10,10 l-10,10 l-10,-10 Z" fill="%23f472b6"/><path d="M100,500 l12,5 l-5,12 l-12,-5 Z" fill="%23f472b6"/><rect x="550" y="500" width="12" height="12" fill="%23f472b6" transform="rotate(15 550 500)"/><circle cx="280" cy="220" r="6" fill="%23f472b6"/><path d="M450,550 q10,-20 20,0" stroke="%23f472b6" stroke-width="3" fill="none"/><circle cx="300" cy="400" r="8" fill="%2334d399"/><rect x="500" y="250" width="15" height="7" fill="%2334d399" transform="rotate(-25 500 250)"/><circle cx="50" cy="50" r="12" fill="%2334d399"/><path d="M200,30 q-10,15 10,20" stroke="%2334d399" stroke-width="2" fill="none"/></g></svg>';


const SVG_GRID = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="%23f8fafc"/><defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="%23e2e8f0" stroke-width="1"/></pattern></defs><rect width="600" height="600" fill="url(%23p)"/></svg>';

interface QrDesign {
  id: string;
  name: string;
  colorDark: string;    
  colorLight: string;   
  textColor: string;   
  artworkSrc?: string;  
  bgColorStyle?: string; 
}

@Component({
  selector: 'app-qrcode',
  templateUrl: './qrcode.component.html',
  styleUrls: ['./qrcode.component.scss']
})
export class QrcodeComponent implements OnInit {
  eStoreLink: string = this.generateNewLink();
  qrCodeDataUrl: string | null = null;
  error: string | null = null;

  
  designs: QrDesign[] = [

    {
      id: 'classic',
      name: 'Classic',
      colorDark: '#000000',
      colorLight: '#ffffff', 
      textColor: '#374151',
      bgColorStyle: '#ffffff'
    },
        {
      id: 'midnight',
      name: 'Midnight',
      colorDark: '#ffffff',
      colorLight: '#ffffff00',
      textColor: '#ffffff',
      artworkSrc: SVG_GEOMETRIC
    },
    {
      id: 'circles',
      name: 'Playful',
      colorDark: '#1f2937',
      colorLight: '#ffffff00', 
      textColor: '#1f2937',
      artworkSrc: SVG_CIRCLES
    },
    {
      id: 'ocean',
      name: 'Waves',
      colorDark: '#0e7490', 
      colorLight: '#ffffff00',
      textColor: '#0e7490',
      artworkSrc: SVG_WAVES
    },
    
 
    {
    id: 'sunrise',
    name: 'Sunrise',
    colorDark: '#ffffff',
    colorLight: '#ffffff00',
    textColor: '#ffffff',
    artworkSrc: SVG_SUNRISE
  },
  {
    id: 'circuit',
    name: 'Tech Blue',
    colorDark: '#38bdf8',
    colorLight: '#ffffff00',
    textColor: '#38bdf8',
    artworkSrc: SVG_CIRCUIT
  },
  {
    id: 'confetti',
    name: 'Pop Shop',
    colorDark: '#1e293b',
    colorLight: '#ffffff00',
    textColor: '#1e293b',
    artworkSrc: SVG_CONFETTI
  },
  {
    id: 'grid',
    name: 'Blueprint',
    colorDark: '#475569',
    colorLight: '#ffffff00',
    textColor: '#475569',
    artworkSrc: SVG_GRID
  },
  ];

  selectedDesign: QrDesign = this.designs[0];

  ngOnInit() {
    this.generateQRCode();
  }

  generateNewLink(): string {
    return `https://${window.location.host}/optimerce/${uuidV4()}`;
  }

  selectDesign(design: QrDesign) {
    this.selectedDesign = design;
    this.generateQRCode();
  }

  async generateQRCode() {
    try {
      this.error = null;
      if (!this.eStoreLink) return;

      this.qrCodeDataUrl = await QRCode.toDataURL(this.eStoreLink, {
        width: 400,
        margin: 2,
        color: {
          dark: this.selectedDesign.colorDark,
          light: this.selectedDesign.colorLight
        }
      });
    } catch (err) {
      this.error = 'Failed to generate QR code';
      console.error(err);
    }
  }

  async regenerateQRCode() {
    this.eStoreLink = this.generateNewLink();
    await this.generateQRCode();
  }


  private async createFinalCanvas(): Promise<HTMLCanvasElement | null> {
    if (!this.qrCodeDataUrl) return null;

    const canvas = document.createElement('canvas');
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;


    if (this.selectedDesign.artworkSrc) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, size, size);
          resolve();
        };

        img.src = this.selectedDesign.artworkSrc!;
      });
    } else {
     
      ctx.fillStyle = this.selectedDesign.bgColorStyle || '#ffffff';
      ctx.fillRect(0, 0, size, size);
    }


    await new Promise<void>((resolve) => {
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 350; 
        const qrX = (size - qrSize) / 2;
        const qrY = (size - qrSize) / 2 - 20;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        resolve();
      };
      qrImg.src = this.qrCodeDataUrl!;
    });

    ctx.fillStyle = this.selectedDesign.textColor;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = this.selectedDesign.id === 'midnight' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('Scan to shop online!', size / 2, size - 70);

    return canvas;
  }

  async downloadQRCode() {
    const canvas = await this.createFinalCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `estore-${this.selectedDesign.id}.png`;
    link.click();
  }

  async shareQRCode() {
    const canvas = await this.createFinalCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'estore-qr.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Visit my E-Store',
            text: 'Scan the QR code to shop our latest collection!',
          });
        } catch (err) {
          console.log('Share cancelled');
        }
      } else {
        alert('Native sharing not supported on this device. Downloading instead.');
        this.downloadQRCode();
      }
    });
  }
}