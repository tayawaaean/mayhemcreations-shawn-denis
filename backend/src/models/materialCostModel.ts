import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface MaterialCostAttributes {
  id: number
  name: string
  cost: number
  width: number
  length: number
  wasteFactor: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MaterialCostCreationAttributes extends Optional<MaterialCostAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class MaterialCost extends Model<MaterialCostAttributes, MaterialCostCreationAttributes> implements MaterialCostAttributes {
  public id!: number
  public name!: string
  public cost!: number
  public width!: number
  public length!: number
  public wasteFactor!: number
  public isActive!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

MaterialCost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    width: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    length: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    wasteFactor: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: 1.0,
        max: 10.0
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'MaterialCost',
    tableName: 'material_costs',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['isActive']
      }
    ]
  }
)

export default MaterialCost

