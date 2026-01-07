import { Component, OnInit } from '@angular/core';
import MonoConnect from '@mono.co/connect.js';
// import MonoConnect from '@mono.co/connect.js';

@Component({
  selector: 'app-connect-mono',
  templateUrl: './connect-mono.component.html',
  styleUrl: './connect-mono.component.scss'
})
export class ConnectMonoComponent implements OnInit {
  public monoInstance: any;

  constructor() {
    this.monoInstance = new MonoConnect({
      key: "live_pk_dsfoxddopzp4ha01xipo",
      onClose: () => console.log('widget closed'),
      onLoad: ()=> console.log('Widget loaded successfully'),
      onSuccess: ({ code }: { code: string }) => console.log(`linked successfully: ${code}`)
    })

    this.monoInstance.setup()
  }

  ngOnInit() {
    // this.monoInstance.open();
  }
}

