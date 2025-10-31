import 'dotenv/config'
import { Sequelize } from 'sequelize'
import { Umzug, SequelizeStorage } from 'umzug'
import { sequelize } from '../config/database'

const umzug = new Umzug({
  migrations: {
    glob: 'src/migrations/*.ts',
    resolve: ({ name, path, context }) => {
      const migration = require(path!)
      return {
        name,
        up: async () => migration.up(context.getQueryInterface(), Sequelize),
        down: async () => migration.down(context.getQueryInterface(), Sequelize),
      }
    },
  },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize, tableName: 'migrations_meta' }),
  logger: console,
})

const cmd = process.argv[2]

;(async () => {
  if (cmd === 'up') await umzug.up()
  else if (cmd === 'down') await umzug.down()
  else if (cmd === 'pending') console.log(await umzug.pending())
  else if (cmd === 'executed') console.log(await umzug.executed())
  else {
    console.log('Usage: ts-node src/scripts/migrate.ts [up|down|pending|executed]')
    process.exit(1)
  }
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})


