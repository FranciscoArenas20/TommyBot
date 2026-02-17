import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('delivery_zonas')
export class DeliveryZona {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  zona: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ default: true })
  disponible: boolean;

  @Column({ length: 50, name: 'tiempo_estimado', nullable: true })
  tiempoEstimado: string;
}