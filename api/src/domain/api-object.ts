import { Expose } from 'class-transformer';
import { BaseEntity, BeforeInsert, BeforeUpdate, Column, PrimaryColumn } from 'typeorm';
import { unixTime, uuid } from '../utils';
import { BadRequestError, InternalServerError } from '../errors';
import { DatabaseError, getDatabaseError } from '../loaders/database';
import { READ } from './groups';

export abstract class ApiObject extends BaseEntity {
  @Expose({ groups: READ })
  abstract object: string;

  @Expose({ groups: READ })
  @PrimaryColumn('uuid')
  id: string;

  @Expose({ groups: READ })
  @Column({ name: 'created_at', default: 0 })
  createdAt: number;

  @Expose({ groups: READ })
  @Column({ name: 'updated_at', default: 0 })
  updatedAt: number;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @BeforeInsert()
  addCreatedTimestamp() {
    this.createdAt = unixTime();
  }

  @BeforeUpdate()
  @BeforeInsert()
  updateUpdatedTimestamp() {
    this.updatedAt = unixTime();
  }

  public async persist() {
    try {
      await this.save();
    } catch (error) {
      switch (getDatabaseError(error)) {
        case DatabaseError.DUPLICATE:
          throw new BadRequestError(`A ${this.object} with that name already exists.`);
        default:
          throw new InternalServerError(error);
      }
    }
  }

  public async delete() {
    try {
      await this.remove();
    } catch (error) {
      throw new InternalServerError(error);
    }
  }
}