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

    const findProducts = products.map(product => {
      if (!isUuid(product.id)) {
        throw new AppError('Product ID invalid!');
      }
      return product.id;
    });
    const searchProducts = await this.productsRepository.findAllById(
      findProducts,
    );

    if (findProducts.length !== searchProducts.length) {
      throw new AppError(`Some product not found!`);
    }

    const order_Products = searchProducts.map((product, index) => {
      if (
        product.id === products[index].id &&
        product.quantity < products[index].quantity
      ) {
        throw new AppError(
          `Insufficient stock for the product: ${product.name}`,
        );
      }
      return {
        product_id: product.id,
        price: product.price,
        quantity: products[index].quantity,
      };
    });

    const updateProducts = products.map(product => ({
      id: product.id,
      quantity: product.quantity,
    }));

    await this.productsRepository.updateQuantity(updateProducts);

    const order = await this.ordersRepository.create({
      customer,
      products: order_Products,
    });

    return order;
  }
}

export default CreateOrderService;
