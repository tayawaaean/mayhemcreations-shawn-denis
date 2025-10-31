import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

export async function up(queryInterface: QueryInterface, _Sequelize: typeof Sequelize) {
  // Example: create a small metadata table; replace with real changes as needed
  await queryInterface.createTable('example_meta', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  })
}

export async function down(queryInterface: QueryInterface, _Sequelize: typeof Sequelize) {
  await queryInterface.dropTable('example_meta')
}


