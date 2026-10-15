const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🚀 Creating admin user...');
    
    // 1. Check if user already exists
    const existingUser = await prisma.usuarios.findFirst({
      where: { Username: 'admin@zyra.com' }
    });

    if (existingUser) {
      console.log('User already exists, updating password...');
      await prisma.usuarios.update({
        where: { ID_Usuario: existingUser.ID_Usuario },
        data: {
          Password_Hash: 'admin123',
          ID_Rol: 1
        }
      });
    } else {
      console.log('Creating new user...');
      // Ensure we have an employee for this admin (optional but good)
      let employeeId = null;
      const existingEmp = await prisma.empleados.findFirst({
        where: { Correo: 'admin@zyra.com' }
      });
      
      if (existingEmp) {
        employeeId = existingEmp.ID_Empleado;
      } else {
        const newEmp = await prisma.empleados.create({
          data: {
            Nombre: 'Administrador ZYRA',
            Correo: 'admin@zyra.com',
            ID_Empresa: 1
          }
        });
        employeeId = newEmp.ID_Empleado;
      }

      await prisma.usuarios.create({
        data: {
          Username: 'admin@zyra.com',
          Password_Hash: 'admin123',
          ID_Empleado: employeeId,
          ID_Rol: 1
        }
      });
    }

    console.log('Admin user ready!');
    console.log('User: admin@zyra.com');
    console.log('Pass: admin123');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
