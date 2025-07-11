// === CONFIG ===
const API_URL = "http://localhost:8080/api/articulos";
const PEDIDOS_API_URL = "http://localhost:8080/api/pedidos";

// === EVENTOS ===
document.addEventListener("DOMContentLoaded", () => {
    listarArticulos();
    configurarEventos();
});

function configurarEventos() {
    document.getElementById("form-articulo").addEventListener("submit", guardarArticulo);
    document.getElementById("cancelar").addEventListener("click", limpiarFormularioArticulo);
    document.getElementById("btnAgregarPedido").addEventListener("click", mostrarSeccionPedido);
    document.getElementById("btnMostrarPedidos").addEventListener("click", alternarSeccionPedidos);
    document.getElementById("btnAgregarArticulo").addEventListener("click", agregarArticuloAlPedido);
    document.getElementById("form-pedido").addEventListener("submit", finalizarPedido);
    document.getElementById("cancelarPedido").addEventListener("click", limpiarFormularioPedido);

}

// === CRUD ARTÍCULOS ===
function listarArticulos() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById("tabla-articulos");
            tbody.innerHTML = "";
            data.forEach(articulo => {
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td>${articulo.id}</td>
                    <td>${articulo.nombre}</td>
                    <td>${(articulo.precio || 0).toFixed(2)}</td>
                    <td>${articulo.stock || 0}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editarArticulo(${articulo.id})">Modificar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarArticulo(${articulo.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(() => showNotification("Error al listar artículos", "error"));
}

function guardarArticulo(e) {
    e.preventDefault();
    const id = document.getElementById("idArticulo").value;
    const articulo = {
        nombre: document.getElementById("nombre").value.trim(),
        precio: parseFloat(document.getElementById("precio").value),
        stock: parseInt(document.getElementById("stock").value)
    };

    if (!articulo.nombre || isNaN(articulo.precio) || articulo.precio < 0 || isNaN(articulo.stock) || articulo.stock < 0) {
        return showNotification("Campos inválidos", "error");
    }

    fetch(id ? `${API_URL}/${id}` : API_URL, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articulo)
    })
        .then(res => {
            if (!res.ok) throw new Error("Error al guardar");
            return res.json();
        })
        .then(() => {
            limpiarFormularioArticulo();
            listarArticulos();
            showNotification("Artículo guardado correctamente");
        })
        .catch(() => showNotification("Error al guardar artículo", "error"));
}

function editarArticulo(id) {
    // Hacer scroll suave al formulario
    document.getElementById("form-articulo").scrollIntoView({ behavior: 'smooth' });

    fetch(`${API_URL}/${id}`)
        .then(res => res.json())
        .then(articulo => {
            document.getElementById("idArticulo").value = articulo.id;
            document.getElementById("nombre").value = articulo.nombre;
            document.getElementById("precio").value = articulo.precio;
            document.getElementById("stock").value = articulo.stock;

            document.getElementById("nombre").focus();
        })
        .catch(() => showNotification("Error al obtener artículo", "error"));
}


function eliminarArticulo(id) {
    mostrarModalConfirmacion(() => {
        fetch(`${API_URL}/${id}`, { method: "DELETE" })
            .then(res => {
                if (!res.ok) throw new Error();
                listarArticulos();
                showNotification("Artículo eliminado correctamente");
            })
            .catch(() => showNotification("Error al eliminar artículo", "error"));
    }, "¿Desea eliminar este artículo?");
}

function limpiarFormularioArticulo() {
    document.getElementById("form-articulo").reset();
    document.getElementById("idArticulo").value = "";
}

// === PEDIDOS ===
let pedidoActual = { nombreCliente: "", dniCliente: "", items: [] };

function mostrarSeccionPedido() {
    document.getElementById("seccionPedido").style.display = "block";
    document.getElementById("seccionMostrarPedidos").style.display = "none";
    document.getElementById("btnMostrarPedidos").textContent = "Mostrar Pedidos";
    cargarArticulosEnSelect();
    actualizarListaArticulosPedido();
}

function alternarSeccionPedidos() {
    const seccion = document.getElementById("seccionMostrarPedidos");
    const visible = seccion.style.display === "block";
    seccion.style.display = visible ? "none" : "block";
    document.getElementById("btnMostrarPedidos").textContent = visible ? "Mostrar Pedidos" : "Ocultar Pedidos";
    document.getElementById("seccionPedido").style.display = "none";
    if (!visible) listarPedidos();
}

function cargarArticulosEnSelect() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById("articuloSelect");
            select.innerHTML = "";
            data.forEach(articulo => {
                const option = document.createElement("option");
                option.value = JSON.stringify(articulo);
                option.textContent = `${articulo.nombre} - Stock: ${articulo.stock}`;
                select.appendChild(option);
            });
        })
        .catch(() => showNotification("Error al cargar artículos", "error"));
}

function agregarArticuloAlPedido() {
    const articulo = JSON.parse(document.getElementById("articuloSelect").value);
    const cantidad = parseInt(document.getElementById("cantidadArticulo").value);

    if (isNaN(cantidad) || cantidad <= 0 || cantidad > articulo.stock) {
        return showNotification("Cantidad inválida o excede stock", "error");
    }

    pedidoActual.items.push({ articulo, cantidad });
    actualizarListaArticulosPedido();
}

function finalizarPedido(event) {
    event.preventDefault();
    const nombreCliente = document.getElementById("nombreCliente").value.trim();
    const dniCliente = document.getElementById("dniCliente").value.trim();

    if (!nombreCliente || !dniCliente || pedidoActual.items.length === 0) {
        return showNotification("Complete todos los campos y agregue artículos", "error");
    }

    const pedidoData = {
        nombreCliente,
        dniCliente,
        items: pedidoActual.items.map(item => ({
            articulo: { id: item.articulo.id },
            cantidad: item.cantidad
        }))
    };

    let url = PEDIDOS_API_URL;
    let method = "POST";

    if (pedidoActual.id) {
        // Es un pedido existente, hacemos PUT
        url = `${PEDIDOS_API_URL}/${pedidoActual.id}`;
        method = "PUT";
        pedidoData.id = pedidoActual.id;  // importante incluir el ID
    }

    fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoData)
    })
    .then(res => {
        if (!res.ok) throw new Error("Error al guardar pedido");
        return res.json();
    })
    .then(() => {
        showNotification(`Pedido ${method === 'POST' ? 'creado' : 'actualizado'} exitosamente`);
        document.getElementById("form-pedido").reset();
        document.getElementById("listaArticulosPedido").innerHTML = "";
        pedidoActual = { nombreCliente: "", dniCliente: "", items: [] };
        listarPedidos();
        document.getElementById("seccionPedido").style.display = "none";
        document.getElementById("seccionMostrarPedidos").style.display = "block";
        document.getElementById("btnMostrarPedidos").textContent = "Ocultar Pedidos";
    })
    .catch(() => showNotification(`Error al ${method === 'POST' ? 'crear' : 'actualizar'} pedido`, "error"));
}


function limpiarFormularioPedido() {
    document.getElementById("form-pedido").reset();
    document.getElementById("listaArticulosPedido").innerHTML = "";
    pedidoActual = { nombreCliente: "", dniCliente: "", items: [] };
    document.getElementById("seccionPedido").style.display = "none";
}




function listarPedidos() {
    fetch(PEDIDOS_API_URL)
        .then(res => res.json())
        .then(pedidos => {
            const tbody = document.getElementById("tabla-pedidos");
            tbody.innerHTML = "";

            if (!pedidos || pedidos.length === 0) {
                const fila = document.createElement("tr");
                fila.innerHTML = `<td colspan="6" class="text-center">No hay pedidos registrados</td>`;
                tbody.appendChild(fila);
                return;
            }

            pedidos.forEach(pedido => {
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td>${pedido.id}</td>
                    <td>${pedido.nombreCliente}</td>
                    <td>${pedido.dniCliente}</td>
                    <td>$${(pedido.total || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="verPedido(${pedido.id})">Ver</button>
                        <button class="btn btn-warning btn-sm" onclick="modificarPedido(${pedido.id})">Modificar</button>
                        <button class="btn btn-success btn-sm" onclick="confirmarPedido(${pedido.id})">Confirmar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarPedido(${pedido.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(() => showNotification("Error al cargar pedidos", "error"));
}


function verPedido(id) {
    fetch(`${PEDIDOS_API_URL}/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("No se pudo obtener el pedido");
            return res.json();
        })
        .then(pedido => {
            const lista = document.getElementById("detallePedidoLista");
            lista.innerHTML = "";

            let total = 0;

            if (!pedido.items || pedido.items.length === 0) {
                lista.innerHTML = "<li class='list-group-item'>No hay artículos en este pedido</li>";
            } else {
                pedido.items.forEach(item => {
                    const subtotal = item.cantidad * item.articulo.precio;
                    total += subtotal;

                    const li = document.createElement("li");
                    li.className = "list-group-item";
                    li.textContent = `${item.articulo.nombre} - Cantidad: ${item.cantidad} - Total: ${item.cantidad * item.articulo.precio.toFixed(2)}`;
                    lista.appendChild(li);
                });

                const totalLi = document.createElement("li");
                totalLi.className = "fw-bold";
                totalLi.style.borderTop = "1px solid #444";
                totalLi.style.paddingTop = "10px";
                totalLi.textContent = `TOTAL DEL PEDIDO: $${total.toFixed(2)}`;
                lista.appendChild(totalLi);
            }

            document.getElementById("modalDetallePedido").style.display = "flex";
        })
        .catch(error => {
            showNotification(error.message, "error");
        });
}


document.getElementById("cerrarDetallePedido").addEventListener("click", () => {
    document.getElementById("modalDetallePedido").style.display = "none";
});

let listenerActualizarPedido = null;

// === FUNCIÓN PARA MODIFICAR PEDIDO ===
function modificarPedido(id) {
    fetch(`${PEDIDOS_API_URL}/${id}`)
        .then(res => res.json())
        .then(pedido => {
            document.getElementById("seccionPedido").style.display = "block";
            document.getElementById("seccionMostrarPedidos").style.display = "none";

            document.getElementById("nombreCliente").value = pedido.nombreCliente;
            document.getElementById("dniCliente").value = pedido.dniCliente;

            pedidoActual = {
                id: pedido.id,
                nombreCliente: pedido.nombreCliente,
                dniCliente: pedido.dniCliente,
                items: pedido.items.map(item => ({
                    articulo: item.articulo,
                    cantidad: item.cantidad
                }))
            };

            cargarArticulosEnSelect();
            actualizarListaArticulosPedido();
        })
        .catch(() => showNotification("Error al cargar pedido para modificación", "error"));
}


// === FUNCIONES AUXILIARES (se mantienen igual) ===
function agregarArticuloAlPedido() {
    const articulo = JSON.parse(document.getElementById("articuloSelect").value);
    const cantidad = parseInt(document.getElementById("cantidadArticulo").value);

    if (isNaN(cantidad) || cantidad <= 0 || cantidad > articulo.stock) {
        return showNotification("Cantidad inválida o excede stock", "error");
    }

    const articuloExistente = pedidoActual.items.find(item => item.articulo.id === articulo.id);
    if (articuloExistente) {
        articuloExistente.cantidad += cantidad;
    } else {
        pedidoActual.items.push({ articulo, cantidad });
    }

    actualizarListaArticulosPedido();
    document.getElementById("cantidadArticulo").value = "";
}

function actualizarListaArticulosPedido() {
    const lista = document.getElementById("listaArticulosPedido");
    lista.innerHTML = "";

    // ✅ Si no hay artículos, mostramos mensaje y salimos
    if (pedidoActual.items.length === 0) {
        const li = document.createElement("li");
        li.className = "list-group-item text-center text-muted";
        li.textContent = "No hay artículos en el pedido.";
        lista.appendChild(li);
        return;  // ⚠️ Importante cortar la función acá
    }

    let total = 0;
    pedidoActual.items.forEach((item, index) => {
        const subtotal = item.articulo.precio * item.cantidad;
        total += subtotal;

        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        const spanInfo = document.createElement("span");
        spanInfo.textContent = `${item.articulo.nombre} - Cantidad: ${item.cantidad} - Total: $${subtotal.toFixed(2)}`;

        const divAcciones = document.createElement("div");

        const inputCantidad = document.createElement("input");
        inputCantidad.type = "number";
        inputCantidad.value = item.cantidad;
        inputCantidad.min = 1;
        inputCantidad.max = item.articulo.stock;
        inputCantidad.className = "form-control form-control-sm cantidad-input";
        inputCantidad.style.width = "70px";
        inputCantidad.style.display = "inline-block";
        inputCantidad.onchange = (e) => {
            const nuevaCantidad = parseInt(e.target.value);
            if (nuevaCantidad >= 1 && nuevaCantidad <= item.articulo.stock) {
                item.cantidad = nuevaCantidad;
                actualizarListaArticulosPedido();
            } else {
                e.target.value = item.cantidad;
                showNotification("Cantidad inválida", "error");
            }
        };

        const btnEliminar = document.createElement("button");
        btnEliminar.className = "btn btn-danger btn-sm ms-2";
        btnEliminar.textContent = "Quitar";
        btnEliminar.onclick = () => eliminarArticuloDePedido(index);

        divAcciones.appendChild(inputCantidad);
        divAcciones.appendChild(btnEliminar);

        li.appendChild(spanInfo);
        li.appendChild(divAcciones);
        lista.appendChild(li);
    });

    const totalLi = document.createElement("li");
    totalLi.className = "list-group-item fw-bold";
    totalLi.textContent = `TOTAL: $${total.toFixed(2)}`;
    lista.appendChild(totalLi);
}


function eliminarArticuloDePedido(index) {
    pedidoActual.items.splice(index, 1);
    actualizarListaArticulosPedido();
}



function confirmarPedido(id) {
    fetch(`${PEDIDOS_API_URL}/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("No se pudo obtener el pedido");
            return res.json();
        })
        .then(pedido => {
            // Verificar stock para cada artículo
            const itemsInsuficientes = pedido.items.filter(item => item.cantidad > item.articulo.stock);
            if (itemsInsuficientes.length > 0) {
                const nombres = itemsInsuficientes.map(i => i.articulo.nombre).join(", ");
                showNotification(`Stock insuficiente para: ${nombres}`, "error");
                return;
            }

            // Si stock ok, actualizar stock para cada artículo (decrementar stock)
            const actualizaciones = pedido.items.map(item => {
                const nuevoStock = item.articulo.stock - item.cantidad;
                return fetch(`${API_URL}/${item.articulo.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre: item.articulo.nombre,
                        precio: item.articulo.precio,
                        stock: nuevoStock
                    })
                });
            });

            Promise.all(actualizaciones)
                .then(() => {
                    eliminarPedidoDirecto(id); // Elimina el pedido confirmado
                    listarArticulos();   // refresca la tabla de artículos (stock actualizado)
                })
                .catch(() => {
                    showNotification("Error al actualizar stock", "error");
                });
        })
        .catch(() => showNotification("Error al confirmar pedido", "error"));
}

function eliminarPedidoDirecto(id) {
    fetch(`${PEDIDOS_API_URL}/${id}`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error();
            listarPedidos();
            showNotification("Pedido confirmado y stock actualizado");
        })
        .catch(() => showNotification("Error al eliminar pedido", "error"));
}


function eliminarPedido(id) {
    mostrarModalConfirmacion(() => {
        fetch(`${PEDIDOS_API_URL}/${id}`, { method: "DELETE" })
            .then(res => {
                if (!res.ok) throw new Error();
                listarPedidos();
                showNotification("Pedido eliminado correctamente");
            })
            .catch(() => showNotification("Error al eliminar pedido", "error"));
    }, "¿Desea eliminar este pedido?");
}



// === UTILIDADES ===
function showNotification(message, type = "success") {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.classList.add("fade-out");
        setTimeout(() => notification.className = "notification", 500);
    }, 4000);
}

function mostrarModalConfirmacion(callback, mensaje) {
    const modal = document.getElementById("modalConfirm");
    const btnYes = document.getElementById("confirmYes");
    const btnNo = document.getElementById("confirmNo");
    const texto = document.getElementById("textoConfirmacion");

    texto.textContent = mensaje; 

    modal.style.display = "flex";

    btnYes.replaceWith(btnYes.cloneNode(true));
    btnNo.replaceWith(btnNo.cloneNode(true));

    document.getElementById("confirmYes").addEventListener("click", () => {
        modal.style.display = "none";
        callback();
    });

    document.getElementById("confirmNo").addEventListener("click", () => {
        modal.style.display = "none";
    });
}
