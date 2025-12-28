const { fetchResultMysql } = require("libs/db");
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
  AdminDeleteUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Obtener usuarios con filtros opcionales
const getUsuarios = fetchResultMysql(
  ({ empresa_id, nombre, email, rol, activo, cognito_id }, connection) => {
    // Convert undefined values to null for MySQL compatibility
    const params = [
      empresa_id || null,
      empresa_id || null,
      nombre || null,
      nombre || null,
      email || null,
      email || null,
      rol || null,
      rol || null,
      activo !== undefined ? activo : null,
      activo !== undefined ? activo : null,
      cognito_id || null,
      cognito_id || null,
    ];

    return connection.execute(
      `SELECT * FROM usuarios 
      WHERE (? IS NULL OR empresa_id = ?)
      AND (? IS NULL OR nombre LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR email LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR rol = ?)
      AND (? IS NULL OR activo = ?)
      AND (? IS NULL OR cognito_id = ?)
      ORDER BY fecha_creacion DESC`,
      params
    );
  }
);

// Buscar usuario por cognito_id
const getUsuarioByCognitoId = fetchResultMysql(
  async ({ cognito_id }, connection) => {
    return connection.execute("SELECT * FROM usuarios WHERE cognito_id = ?", [
      cognito_id,
    ]);
  },
  { singleResult: true }
);

// Buscar usuario por id
const getUsuarioById = fetchResultMysql(
  async ({ id }, connection) => {
    return connection.execute("SELECT * FROM usuarios WHERE id = ?", [id]);
  },
  { singleResult: true }
);

// Crear nuevo usuario en BD
const createUsuario = fetchResultMysql(
  async (
    { empresa_id, cognito_id, nombre, email, rol, activo },
    connection
  ) => {
    // Si activo no se proporciona, usar default de 1
    const activoValue = activo !== undefined ? activo : 1;

    await connection.execute(
      `
      INSERT INTO usuarios (
        empresa_id, cognito_id, nombre, email, rol, activo
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [empresa_id || null, cognito_id, nombre, email, rol, activoValue]
    );
    const [result] = await connection.execute(
      "SELECT * FROM usuarios WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
);

// Actualizar usuario por cognito_id (solo nombre y rol)
const updateUsuarioByCognitoId = fetchResultMysql(
  async ({ cognito_id, nombre, rol }, connection) => {
    await connection.execute(
      `
      UPDATE usuarios
      SET nombre = ?, rol = ?
      WHERE cognito_id = ?
      `,
      [nombre, rol, cognito_id]
    );
    return connection.execute("SELECT * FROM usuarios WHERE cognito_id = ?", [
      cognito_id,
    ]);
  },
  { singleResult: true }
);

// Eliminar usuario
const deleteUsuario = fetchResultMysql(({ id }, connection) => {
  return connection.execute(`DELETE FROM usuarios WHERE id = ?`, [id]);
});

// Actualizar usuario
const updateUsuario = fetchResultMysql(
  async ({ id, empresa_id, nombre, email, rol, activo }, connection) => {
    // Construir query dinámicamente para solo actualizar campos proporcionados
    const updates = [];
    const values = [];

    if (empresa_id !== undefined) {
      updates.push("empresa_id = ?");
      values.push(empresa_id || null);
    }
    if (nombre !== undefined) {
      updates.push("nombre = ?");
      values.push(nombre);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      values.push(email);
    }
    if (rol !== undefined) {
      updates.push("rol = ?");
      values.push(rol);
    }
    if (activo !== undefined) {
      updates.push("activo = ?");
      values.push(activo);
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(id);

    await connection.execute(
      `
      UPDATE usuarios
      SET ${updates.join(", ")}
      WHERE id = ?
      `,
      values
    );
    const [result] = await connection.execute(
      "SELECT * FROM usuarios WHERE id = ?",
      [id]
    );
    return result;
  },
  { singleResult: true }
);

// Handler GET - Obtener usuarios
const getUsuario = async ({ request, params }) => {
  const { empresa_id, nombre, email, rol, activo, cognito_id } = params;
  const usuarios = await getUsuarios({
    empresa_id,
    nombre,
    email,
    rol,
    activo,
    cognito_id,
  });
  return usuarios;
};

// Handler POST - Crear usuario
const postUsuario = async ({ request, params }) => {
  const { empresa_id, nombre, email, rol, activo, password } = params;

  // Validar campos requeridos
  if (!nombre || !email || !rol || !password) {
    throw new Error("Missing required fields: nombre, email, rol, password");
  }

  // Validar que el rol sea uno de los valores permitidos
  const rolesPermitidos = ["admin", "vendedor", "bodega", "master"];
  if (!rolesPermitidos.includes(rol)) {
    throw new Error(
      `Invalid rol. Must be one of: ${rolesPermitidos.join(", ")}`
    );
  }

  // Configurar cliente de Cognito
  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const userPoolId = process.env.AWS_POOL_ID || "us-east-1_PB7A5yutH";

  let cognitoUserId = null;

  try {
    // 1. Crear usuario en Cognito
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
        {
          Name: "name",
          Value: nombre,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
      MessageAction: "SUPPRESS", // No enviar email de bienvenida
      TemporaryPassword: password,
      ForceAliasCreation: false,
    });

    const cognitoResponse = await cognitoClient.send(createUserCommand);

    // El cognito_id es el atributo "sub" del usuario
    const subAttribute = cognitoResponse.User?.Attributes?.find(
      (attr) => attr.Name === "sub"
    );
    cognitoUserId = subAttribute?.Value;

    // Si no viene en la respuesta, obtener el usuario recién creado
    if (!cognitoUserId) {
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email,
      });
      const userResponse = await cognitoClient.send(getUserCommand);
      const subAttr = userResponse.UserAttributes?.find(
        (attr) => attr.Name === "sub"
      );
      cognitoUserId = subAttr?.Value;
    }

    if (!cognitoUserId) {
      throw new Error("No se pudo obtener el ID de Cognito del usuario creado");
    }

    // Establecer la contraseña permanente (no temporal)
    try {
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true, // Marcar como permanente, no temporal
      });
      await cognitoClient.send(setPasswordCommand);
    } catch (passwordError) {
      // Si falla establecer la contraseña, continuar de todas formas
      // El usuario ya fue creado y puede cambiar su contraseña en el primer login
      console.warn(
        "Warning: No se pudo establecer la contraseña permanente:",
        passwordError.message
      );
    }
  } catch (error) {
    // Si el usuario ya existe en Cognito, intentar obtenerlo
    if (
      error.name === "UsernameExistsException" ||
      error.name === "AliasExistsException"
    ) {
      try {
        const getUserCommand = new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: email,
        });
        const userResponse = await cognitoClient.send(getUserCommand);
        const subAttr = userResponse.UserAttributes?.find(
          (attr) => attr.Name === "sub"
        );
        cognitoUserId = subAttr?.Value;

        if (!cognitoUserId) {
          throw new Error(
            "No se pudo obtener el ID de Cognito del usuario existente"
          );
        }
      } catch (getUserError) {
        throw new Error(
          `Error al obtener usuario existente en Cognito: ${getUserError.message}`
        );
      }
    } else {
      throw new Error(`Error al crear usuario en Cognito: ${error.message}`);
    }
  }

  // 2. Verificar si el usuario ya existe en la BD
  const usuarioExistente = await getUsuarioByCognitoId({
    cognito_id: cognitoUserId,
  });

  if (usuarioExistente) {
    // 3. Si existe, actualizar solo nombre y rol
    const usuarioActualizado = await updateUsuarioByCognitoId({
      cognito_id: cognitoUserId,
      nombre,
      rol,
    });
    return usuarioActualizado;
  } else {
    // 4. Si no existe, crear nuevo registro
    const activoValue = activo !== undefined ? activo : 1;
    const nuevoUsuario = await createUsuario({
      empresa_id: empresa_id || null,
      cognito_id: cognitoUserId,
      nombre,
      email,
      rol,
      activo: activoValue,
    });
    return nuevoUsuario;
  }
};

// Handler PUT - Actualizar usuario
const putUsuario = async ({ request, params }) => {
  const { id, empresa_id, nombre, email, rol, activo } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  // Validar rol si se proporciona
  if (rol !== undefined) {
    const rolesPermitidos = ["admin", "vendedor", "bodega", "master"];
    if (!rolesPermitidos.includes(rol)) {
      throw new Error(
        `Invalid rol. Must be one of: ${rolesPermitidos.join(", ")}`
      );
    }
  }

  // Obtener usuario actual para comparar estado y obtener cognito_id y email
  const usuarioActual = await getUsuarioById({ id });
  if (!usuarioActual) {
    throw new Error("Usuario not found");
  }

  // Configurar cliente de Cognito
  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const userPoolId = process.env.AWS_POOL_ID || "us-east-1_PB7A5yutH";

  // Normalizar valores de activo para comparación
  const activoActual = Number(usuarioActual.activo) || 0;
  const activoNuevo = activo !== undefined ? Number(activo) || 0 : undefined;

  // Si se está actualizando el estado activo, sincronizar con Cognito
  if (activoNuevo !== undefined && activoActual !== activoNuevo) {
    try {
      const cognitoEmail = email || usuarioActual.email;

      if (activoNuevo === 1) {
        // Habilitar usuario en Cognito
        const enableCommand = new AdminEnableUserCommand({
          UserPoolId: userPoolId,
          Username: cognitoEmail,
        });
        await cognitoClient.send(enableCommand);
        console.log(`Usuario ${cognitoEmail} habilitado en Cognito`);
      } else if (activoNuevo === 0) {
        // Deshabilitar usuario en Cognito
        const disableCommand = new AdminDisableUserCommand({
          UserPoolId: userPoolId,
          Username: cognitoEmail,
        });
        await cognitoClient.send(disableCommand);
        console.log(`Usuario ${cognitoEmail} deshabilitado en Cognito`);
      }
    } catch (cognitoError) {
      // Si falla la sincronización con Cognito, continuar con la actualización en BD
      // pero registrar el error
      console.error(
        `Error al sincronizar estado con Cognito: ${cognitoError.message}`,
        cognitoError
      );
      // No lanzar error, solo registrar para que la actualización en BD continúe
    }
  }

  const usuario = await updateUsuario({
    id,
    empresa_id,
    nombre,
    email,
    rol,
    activo,
  });

  if (!usuario) {
    throw new Error("Usuario not found");
  }

  return usuario;
};

// Handler DELETE - Eliminar usuario
const deleteUsuarioHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  // Obtener usuario antes de eliminarlo para obtener email y cognito_id
  const usuario = await getUsuarioById({ id });
  if (!usuario) {
    throw new Error("Usuario not found");
  }

  // Configurar cliente de Cognito
  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const userPoolId = process.env.AWS_POOL_ID || "us-east-1_PB7A5yutH";

  // Eliminar usuario de Cognito
  try {
    const deleteCommand = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: usuario.email,
    });
    await cognitoClient.send(deleteCommand);
  } catch (cognitoError) {
    // Si el usuario no existe en Cognito, continuar con la eliminación en BD
    if (
      cognitoError.name !== "UserNotFoundException" &&
      cognitoError.name !== "ResourceNotFoundException"
    ) {
      console.warn(
        `Warning: No se pudo eliminar usuario de Cognito: ${cognitoError.message}`
      );
      // Continuar con la eliminación en BD de todas formas
    }
  }

  // Eliminar usuario de la BD
  await deleteUsuario({ id });
  return { success: true };
};

module.exports = {
  getUsuario,
  postUsuario,
  putUsuario,
  deleteUsuario: deleteUsuarioHandler,
};
