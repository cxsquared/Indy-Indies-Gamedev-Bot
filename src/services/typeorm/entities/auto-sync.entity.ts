import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class AutoSync {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: string; // technically a snowflake

  @Column()
  channelId: string; // technically a snowflake

  @Column()
  urlname: string; // meetup.com urlname

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  updated!: Date;

  // Add this column to your entity!
  @DeleteDateColumn()
  deletedAt?: Date;
}
