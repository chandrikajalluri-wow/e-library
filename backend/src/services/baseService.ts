import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { NotFoundError } from '../utils/errors';

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface FindAllOptions {
    pagination?: PaginationOptions;
    sort?: any;
    populate?: string | string[] | any;
    select?: string;
}

/**
 * Generic Base Service for standard CRUD operations
 */
export class BaseService<T extends Document> {
    constructor(public model: Model<T>) { }

    /**
     * Find all records with optional filtering, pagination, sorting and population
     */
    async findAll(filter: FilterQuery<T> = {}, options: FindAllOptions = {}): Promise<any> {
        const { pagination, sort = { createdAt: -1 }, populate, select } = options;

        let query: any = this.model.find(filter);

        if (select) query = query.select(select);
        if (sort) query = query.sort(sort);
        if (populate) query = query.populate(populate as any);

        if (pagination) {
            const skip = (pagination.page - 1) * pagination.limit;
            query = query.skip(skip).limit(pagination.limit);
        }

        const data = await query.exec();
        const total = await this.model.countDocuments(filter);

        if (pagination) {
            return {
                data,
                total,
                page: pagination.page,
                pages: Math.ceil(total / pagination.limit)
            };
        }

        return data;
    }

    /**
     * Find a single record by ID with optional population
     */
    async findById(id: string, populate?: string | string[] | any, select?: string): Promise<T> {
        let query: any = this.model.findById(id);

        if (select) query = query.select(select);
        if (populate) query = query.populate(populate as any);

        const record = await query.exec();
        if (!record) {
            throw new NotFoundError(`${this.model.modelName} not found`);
        }
        return record;
    }

    /**
     * Find a single record by filter
     */
    async findOne(filter: FilterQuery<T>, populate?: string | string[] | any, select?: string): Promise<T | null> {
        let query: any = this.model.findOne(filter);

        if (select) query = query.select(select);
        if (populate) query = query.populate(populate as any);

        return await query.exec();
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T>): Promise<T> {
        const record = new this.model(data);
        return await record.save() as any;
    }

    /**
     * Update a record by ID
     */
    async update(id: string, data: UpdateQuery<T>, options: QueryOptions = { new: true, runValidators: true }): Promise<T> {
        const record = await this.model.findByIdAndUpdate(id, data, options).exec();
        if (!record) {
            throw new NotFoundError(`${this.model.modelName} not found`);
        }
        return record as any;
    }

    /**
     * Delete a record by ID
     */
    async delete(id: string) {
        const record = await this.model.findByIdAndDelete(id).exec();
        if (!record) {
            throw new NotFoundError(`${this.model.modelName} not found`);
        }
        return record;
    }

    /**
     * Update many records by filter
     */
    async updateMany(filter: FilterQuery<T>, data: UpdateQuery<T>, options: QueryOptions = {}) {
        return await this.model.updateMany(filter, data, options).exec();
    }

    /**
     * Delete a single record by filter
     */
    async deleteOne(filter: FilterQuery<T>) {
        const record = await this.model.findOneAndDelete(filter).exec();
        if (!record) {
            throw new NotFoundError(`${this.model.modelName} not found`);
        }
        return record;
    }

    /**
     * Delete many records by filter
     */
    async deleteMany(filter: FilterQuery<T>) {
        return await this.model.deleteMany(filter).exec();
    }

    /**
     * Count records matching a filter
     */
    async count(filter: FilterQuery<T> = {}) {
        return await this.model.countDocuments(filter);
    }

    /**
     * Check if a record exists matching a filter
     */
    async exists(filter: FilterQuery<T>) {
        return await this.model.exists(filter);
    }
}
