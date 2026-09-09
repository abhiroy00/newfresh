type ToastProduct = { name: string; image?: string; price?: number; unit?: string };
type ShowFn = (product: ToastProduct) => void;

let _handler: ShowFn | null = null;

export function showCartToast(product: ToastProduct) {
  _handler?.(product);
}

export function _registerCartToastHandler(fn: ShowFn | null) {
  _handler = fn;
}
