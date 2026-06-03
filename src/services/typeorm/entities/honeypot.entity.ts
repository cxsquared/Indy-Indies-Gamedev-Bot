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

  @Column({ nullable: false })
  channelId: string; // technically a snowflake

  @OneToMany(() => HoneypotEvent, (event) => event.honeypot)
  events: HoneypotEvent[];

  @Column()
  notifyChannelId?: string; // technically a snowflake

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  updated!: Date;

  // Add this column to your entity!
  @DeleteDateColumn()
  deletedAt?: Date;
}
