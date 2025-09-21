import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CustomEmbroideryAttributes {
  id: number
  userId: number
  designName: string
  designFile: string // Base64 encoded file
  designPreview: string // Base64 preview image
  dimensions: {
    width: number
    height: number
  }
  selectedStyles: {
    coverage: {
      id: string
      name: string
      price: number
    } | null
    material: {
      id: string
      name: string
      price: number
    } | null
    border: {
      id: string
      name: string
      price: number
    } | null
    threads: {
      id: string
      name: string
      price: number
    }[]
    backing: {
      id: string
      name: string
      price: number
    } | null
    upgrades: {
      id: string
      name: string
      price: number
    }[]
    cutting: {
      id: string
      name: string
      price: number
    } | null
  }
  materialCosts: {
    fabricCost: number
    patchAttachCost: number
    threadCost: number
    bobbinCost: number
    cutAwayStabilizerCost: number
    washAwayStabilizerCost: number
    totalCost: number
  }
  optionsPrice: number
  totalPrice: number
  status: 'pending' | 'approved' | 'in_production' | 'completed' | 'cancelled'
  notes: string
  estimatedCompletionDate?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface CustomEmbroideryCreationAttributes extends Optional<CustomEmbroideryAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class CustomEmbroidery extends Model<CustomEmbroideryAttributes, CustomEmbroideryCreationAttributes> implements CustomEmbroideryAttributes {
  public id!: number
  public userId!: number
  public designName!: string
  public designFile!: string
  public designPreview!: string
  public dimensions!: {
    width: number
    height: number
  }
  public selectedStyles!: {
    coverage: {
      id: string
      name: string
      price: number
    } | null
    material: {
      id: string
      name: string
      price: number
    } | null
    border: {
      id: string
      name: string
      price: number
    } | null
    threads: {
      id: string
      name: string
      price: number
    }[]
    backing: {
      id: string
      name: string
      price: number
    } | null
    upgrades: {
      id: string
      name: string
      price: number
    }[]
    cutting: {
      id: string
      name: string
      price: number
    } | null
  }
  public materialCosts!: {
    fabricCost: number
    patchAttachCost: number
    threadCost: number
    bobbinCost: number
    cutAwayStabilizerCost: number
    washAwayStabilizerCost: number
    totalCost: number
  }
  public optionsPrice!: number
  public totalPrice!: number
  public status!: 'pending' | 'approved' | 'in_production' | 'completed' | 'cancelled'
  public notes!: string
  public estimatedCompletionDate?: Date
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CustomEmbroidery.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    designName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    designFile: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    designPreview: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    selectedStyles: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    materialCosts: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    optionsPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'in_production', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    estimatedCompletionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CustomEmbroidery',
    tableName: 'custom_embroidery_orders',
    timestamps: true,
  }
)
