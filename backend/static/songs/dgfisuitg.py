import asyncio, asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:dpUCipwJbPWhBtgijqAdWdXTuAlGMISF@gondola.proxy.rlwy.net:29725/railway')
    print("Connected!")
    await conn.close()

asyncio.run(test())
