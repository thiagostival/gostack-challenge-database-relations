import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = await this.ormRepository.create({
      name,
      price,
      quantity,
    });

    await this.ormRepository.save(product);

    return {
      ...product,
      quantity: Number(quantity),
    };
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const findProduct = await this.ormRepository.findOne({
      where: {
        name,
      },
    });
    return findProduct;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const findProducts = await this.ormRepository.find({
      where: { id: In(products.map(product => product.id)) },
    });
    findProducts.map(product => ({
      ...product,
      quantity: Number(product.quantity),
    }));
    return findProducts;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    products.map(async product => {
      await this.ormRepository.update(product.id, {
        quantity: () => `quantity - ${product.quantity}`,
      });
    });

    const updatedProducts = await this.findAllById(products);
    updatedProducts.map(product => ({
      ...product,
      quantity: Number(product.quantity),
    }));

    return updatedProducts;
  }
}

export default ProductsRepository;
