import React from 'react';

export const Slider = (props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}) => (
  <div>
    <label htmlFor={props.name} className="block text-sm font-medium text-gray-700 mb-2">
      {props.label}: {props.value}{props.suffix}
    </label>
    <input
      id={props.name}
      type="range"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      onChange={props.onChange}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
      style={{
        background: `linear-gradient(to right, #000 0%, #000 ${((props.value - props.min) / (props.max - props.min)) * 100}%, #e5e7eb ${((props.value - props.min) / (props.max - props.min)) * 100}%, #e5e7eb 100%)`
      }}
    />
    <div className="flex justify-between text-xs text-gray-500 mt-1">
      <span>{props.min}{props.suffix}</span>
      <span>{props.max}{props.suffix}</span>
    </div>
    {props.children}
  </div>
);

export const Checkbox = (props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  centered?: boolean;
}) => (
  <label className={`flex items-center gap-3 cursor-pointer ${props.centered ? 'justify-center' : ''}`}>
    <input
      type="checkbox"
      checked={props.checked}
      onChange={props.onChange}
      className="w-5 h-5 accent-black cursor-pointer flex-shrink-0"
    />
    <span className="text-sm text-gray-700">{props.label}</span>
  </label>
);

export const SectionBox = (props: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="bg-gray-50 p-3 rounded-lg border border-gray-200">
    <h3 className="text-sm font-medium text-gray-900 mb-3">{props.title}</h3>
    {props.children}
  </section>
);

export const Logo = () => (
  <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
    <path fill="#000000" d="M392.438232,73.929527 C334.905548,93.546967 286.036163,126.159508 246.429581,172.262344 C206.917343,218.255417 182.346451,271.288300 172.786514,331.283081 C168.351852,359.113495 168.731567,387.052765 169.776123,415.036591 C169.844788,416.876617 171.137177,419.092743 172.542816,420.400421 C238.180176,481.463989 303.889435,542.450317 369.626587,603.406494 C370.929260,604.614502 372.661163,605.359680 374.277649,606.373962 C307.950836,674.987122 242.808014,742.375427 177.545914,809.887085 C201.769104,833.315979 225.534866,856.302490 249.414154,879.398804 C338.609680,787.136658 427.395538,695.298279 516.320862,603.315674 C514.781616,601.858154 513.591064,600.711182 512.379761,599.586548 C432.513092,525.440063 352.653107,451.286377 272.737183,377.192963 C270.267731,374.903442 268.855957,372.768372 269.104279,369.148895 C270.558716,347.950836 273.752167,327.022552 281.606842,307.248505 C317.356354,217.249481 384.353333,167.247208 479.933746,157.249390 C547.889343,150.141159 608.473389,170.658203 659.339478,216.489380 C706.815613,259.266144 732.323669,313.197113 732.775269,377.378265 C733.508057,481.526398 732.988586,585.683350 733.008301,689.836548 C733.008545,691.264343 733.145081,692.692200 733.209656,693.957397 C766.637146,693.957397 799.586670,693.957397 832.969727,693.957397 C832.969727,691.950134 832.970093,690.161438 832.969604,688.372681 C832.944397,586.884888 832.740723,485.396698 832.974976,383.909546 C833.080261,338.323608 824.710999,294.599365 806.351379,252.886627 C737.474060,96.398132 557.358276,18.474409 392.438232,73.929527 M833.000000,829.500000 C833.000000,815.915710 833.000000,802.331360 833.000000,788.378418 C710.282898,788.378418 588.244751,788.378418 466.294617,788.378418 C466.294617,821.658081 466.294617,854.728088 466.294617,887.713501 C588.653015,887.713501 710.716553,887.713501 833.000000,887.713501 C833.000000,868.451904 833.000000,849.475952 833.000000,829.500000 z"/>
  </svg>
);

export const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
