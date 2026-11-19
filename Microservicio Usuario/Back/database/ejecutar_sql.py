import os
import re
import pymssql

SERVER = '127.0.0.1'
PORT = 1433
USER = 'sa'
PASSWORD = '1234567'

def ejecutar_script_sql(conn, filepath):
    print(f"\n📂 Ejecutando: {os.path.basename(filepath)}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        contenido = f.read()

    # Separar por 'GO' case-insensitive en lineas individuales
    bloques = re.split(r'^\s*GO\s*$', contenido, flags=re.MULTILINE | re.IGNORECASE)
    
    cursor = conn.cursor()
    for i, bloque in enumerate(bloques):
        bloque_limpio = bloque.strip()
        if not bloque_limpio:
            continue
        try:
            cursor.execute(bloque_limpio)
            conn.commit()
        except Exception as e:
            print(f"⚠️ Error en bloque {i+1}: {e}")
            conn.rollback()
    cursor.close()
    print(f"✅ Finalizado: {os.path.basename(filepath)}")

def main():
    print("🔌 Conectando a SQL Server SQLEXPRESS...")
    conn = pymssql.connect(
        server=SERVER,
        port=PORT,
        user=USER,
        password=PASSWORD,
        autocommit=True
    )
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    init_sql = os.path.join(base_dir, 'init_database.sql')
    seed_sql = os.path.join(base_dir, 'seed_data.sql')

    ejecutar_script_sql(conn, init_sql)
    ejecutar_script_sql(conn, seed_sql)

    # Verificar conteos
    cursor = conn.cursor(as_dict=True)
    cursor.execute("USE BBDD_SmartGym_Usuarios")
    
    tablas = [
        'Roles', 'Usuarios', 'Clientes', 'Personal',
        'HistorialMediciones', 'ObservacionesEntrenador',
        'FichaMedicaPARQ', 'MetasPersonales', 'PreferenciasDeportivas',
        'SesionesActivas', 'Auditoria'
    ]
    
    print("\n📊 Resumen de registros creados en BBDD_SmartGym_Usuarios:")
    print("-" * 45)
    for t in tablas:
        try:
            cursor.execute(f"SELECT COUNT(*) as total FROM {t}")
            row = cursor.fetchone()
            print(f"  • {t.ljust(25)} : {row['total']} registros")
        except Exception as e:
            print(f"  • {t.ljust(25)} : ERROR ({e})")
    print("-" * 45)
    
    conn.close()
    print("🏁 Inicialización completada con éxito.")

if __name__ == '__main__':
    main()
