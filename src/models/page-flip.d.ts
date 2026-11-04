// Narrow adapter surface for page-flip 2.0.7, which ships TS source but no declarations.
declare module 'page-flip' {
 export class PageFlip {
  constructor(element:HTMLElement,settings:{width:number;height:number;size:'stretch'|'fixed';minWidth:number;maxWidth:number;minHeight:number;maxHeight:number;autoSize:boolean;startPage:number;usePortrait:boolean;drawShadow:boolean;maxShadowOpacity:number;flippingTime:number;mobileScrollSupport:boolean;showPageCorners:boolean;disableFlipByClick:boolean;useMouseEvents:boolean;swipeDistance:number});
  loadFromHTML(pages:HTMLElement[]):void;
  on(event:string,callback:(event:{data:number|string;object:PageFlip})=>void):void;
  off(event:string):void;
  getState():string;
  getOrientation():'portrait'|'landscape';
  getCurrentPageIndex():number;
  flipNext():void;flipPrev():void;turnToPage(index:number):void;destroy():void;
 }
}
