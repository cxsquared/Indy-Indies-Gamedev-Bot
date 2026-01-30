import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Honeypot } from './honeypot.entity';

@Entity()
export class HoneypotEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Honeypot, (honeypot) => honeypot.events)
  honeypot: Honeypot;

  @Column()
  memberId: string; // technically a snowflake

  @Column()
  event: string;

  @Column()
  message: string;

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  updated!: Date;

  // Add this column to your entity!
  @DeleteDateColumn()
  deletedAt?: Date;
}
