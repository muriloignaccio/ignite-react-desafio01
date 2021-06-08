import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const isProductInCart = updatedCart.find(product => product.id === productId);
      const productAmount = isProductInCart ? isProductInCart.amount : 0;
      const newAmount = productAmount + 1;
      
      const { data: productInStock } = await api.get<Stock>(`/stock/${productId}`);

      if (newAmount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      if (isProductInCart) {
        isProductInCart.amount = newAmount;
      } else {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        const newProduct = {...product, amount: newAmount };
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      toast.success("Produto adicionado com sucesso!");

      return localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const doesProductExists = cart.find(product => product.id === productId);
      
      if (!doesProductExists) throw new Error();
      
      const updatedCart = [...cart.filter(product => product.id !== productId)];

      setCart(updatedCart);

      toast.success("Produto removido  com sucesso!");

      return localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      return toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // TODO
      if (amount <= 0 ) return;

      const { data: productInStock } = await api.get<Stock>(`/stock/${productId}`);
      
      if (productInStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const updatedCart = [...cart];

      const doesProductExists = updatedCart.find((product) => product.id === productId);

      if (!doesProductExists) throw new Error();

      doesProductExists.amount = amount;

      setCart(updatedCart);

      return localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
