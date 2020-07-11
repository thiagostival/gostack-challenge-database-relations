import { inject, injectable } from 'tsyringe';
import { isUuid } from 'uuidv4';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IProductOrder {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer not exist!');
    }

    products.map(product => {
      if (!isUuid(product.id)) {
        throw new AppError('Product ID invalid!');
      }
      return product.id;
    });
    const searchProducts = await this.productsRepository.findAllById(products);

    if (products.length !== searchProducts.length) {
      throw new AppError(`Some product not found!`);
    }

    const order_Products: IProductOrder[] = [];
    products.forEach((product, index) => {
      searchProducts.forEach(searchProduct => {
        if (product.id === searchProduct.id) {
          if (searchProduct.quantity === 0) {
            throw new AppError(
              `Out of stock for product: ${searchProduct.name}`,
            );
          } else if (searchProduct.quantity < product.quantity) {
            throw new AppError(
              `Insufficient stock for the product: ${searchProduct.name}`,
            );
          }
          order_Products[index] = {
            product_id: product.id,
            price: searchProduct.price,
            quantity: product.quantity,
          };
        }
      });
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: order_Products,
    });

    return order;
  }
}

export default CreateOrderService;
