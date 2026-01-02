import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
