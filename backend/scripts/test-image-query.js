const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nga_museum',
  user: 'postgres',
  password: 'password',
});

async function test() {
  try {
    // Get one object
    const objResult = await pool.query(
      'SELECT id, object_id, title FROM objects WHERE object_id LIKE \'TEST.%\' LIMIT 1'
    );
    
    if (objResult.rows.length === 0) {
      console.log('No test objects found');
      return;
    }
    
    const obj = objResult.rows[0];
    console.log('Object:', obj.object_id, 'ID:', obj.id);
    
    // Get images for this object
    const imgResult = await pool.query(
      'SELECT id, uuid, iiif_url, iiif_thumb_url FROM images WHERE object_id = $1',
      [obj.id]
    );
    
    console.log('Images found:', imgResult.rows.length);
    console.log('Images:', JSON.stringify(imgResult.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
