import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity()
export class SyncedEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: string; // technically a snowflake

  @Column()
  eventId: string;

  @Column()
  eventSource: string;

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  updated!: Date;

  // Add this column to your entity!
  @DeleteDateColumn()
  deletedAt?: Date;
}
