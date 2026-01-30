import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HoneypotEvent } from './honeypot-event.entity';

@Entity()
export class Honeypot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  guildId: string; // technically a snowflake

  @Column()
  channelId: string; // technically a snowflake

  @OneToMany(() => HoneypotEvent, (event) => event.honeypot)
  events: HoneypotEvent[];

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  updated!: Date;

  // Add this column to your entity!
  @DeleteDateColumn()
  deletedAt?: Date;
}
