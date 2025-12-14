const mysql = require('mysql2/promise')
const { Logger } = require('./logger')
const { camelizeKeys } = require('./string')

const mysqlConfig = {
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT || 3306,
  ssl: false,
}

function fetchResultMysql(query, { singleResult = false } = {}) {
  return async (...args) => {
    const connection = await mysql.createConnection(mysqlConfig)
    try {
      const result = await query(...args, connection)

      // Si el resultado ya es un array de records (no un resultado de MySQL), usarlo directamente
      if (
        Array.isArray(result) &&
        result.length > 0 &&
        !Array.isArray(result[0])
      ) {
        return singleResult ? result[0] : result
      }

      // Si es un resultado de MySQL [rows, fields], extraer los rows
      const records = result[0] // MySQL returns [rows, fields]
      const camelizedRecords = records.map(camelizeKeys)
      return singleResult ? camelizedRecords[0] : camelizedRecords
    } catch (error) {
      Logger.error(error)
      throw error
    } finally {
      await connection.end()
    }
  }
}

function transaction(callback) {
  return async (...args) => {
    const connection = await mysql.createConnection(mysqlConfig)
    try {
      await connection.beginTransaction()
      const result = await callback(...args, connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      await connection.end()
    }
  }
}

module.exports = {
  fetchResultMysql,
  transaction,
  mysqlConfig,
}

