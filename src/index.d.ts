interface ConnectModel {
  [key: string]: any;
}

export default function connect(model: ConnectModel, bindings?: any): any;

export function loadable(state: any): any;
