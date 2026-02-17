import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from './Categoria';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'categoria_id' })
  categoriaId: number;

  @ManyToOne(() => Categoria, categoria => categoria.productos)
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_kilo', nullable: true })
  precioKilo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_saco', nullable: true })
  precioSaco: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'peso_saco_kg', nullable: true })
  pesoSacoKg: number;

  @Column({ default: true })
  disponible: boolean;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}