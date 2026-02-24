import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clienteNombre: string;

  @Column()
  clienteTelefono: string;

  @Column('text')
  productos: string; // JSON string con array de productos

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ nullable: true })
  zonaEntrega: string;

  @Column({ default: 'pendiente' })
  estado: string; // pendiente, confirmado, entregado, cancelado

  @CreateDateColumn()
  createdAt: Date;
}