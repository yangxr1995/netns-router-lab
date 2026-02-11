function registerNodeTypes() {
    function InternetNode() {
        this.title = "Internet";
        this.name = "internet";
        this.size = [140, 60];
        this.color = "#9b59b6";
        this.shape = LiteGraph.ROUND_SHAPE;
        this.addOutput("out", 0);
    }
    InternetNode.title = "Internet";
    LiteGraph.registerNodeType("network/internet", InternetNode);

    function RouterNode() {
        this.title = "Router";
        this.name = "router";
        this.properties = {
            name: "router",
            br: true,
            vlan: false,
            vid: 0,
            lan: "",
            ifname: "",
            ifname_parent: "",
            forward: true,
            gid: -1,
            gw: false,
            disable: false,
            exec: []
        };
        this.size = [180, 120];
        this.color = "#e74c3c";
        this.shape = LiteGraph.BOX_SHAPE;
        this.addInput("in", 0);
        this.addOutput("out", 0);
    }
    RouterNode.title = "Router";
    LiteGraph.registerNodeType("network/router", RouterNode);

    function SwitchNode() {
        this.title = "Switch";
        this.name = "switch";
        this.properties = {
            name: "switch",
            br: true,
            vlan: false,
            vid: 0,
            lan: "",
            ifname: "",
            ifname_parent: "",
            forward: true,
            gid: -1,
            gw: false,
            disable: false,
            exec: []
        };
        this.size = [180, 120];
        this.color = "#3498db";
        this.shape = LiteGraph.BOX_SHAPE;
        this.addInput("in", 0);
        this.addOutput("out", 0);
    }
    SwitchNode.title = "Switch";
    LiteGraph.registerNodeType("network/switch", SwitchNode);

    function PCNode() {
        this.title = "PC";
        this.name = "pc";
        this.properties = {
            name: "pc",
            br: false,
            vlan: false,
            vid: 0,
            lan: "",
            ifname: "",
            ifname_parent: "",
            forward: false,
            gid: -1,
            gw: false,
            disable: false,
            exec: []
        };
        this.size = [160, 100];
        this.color = "#27ae60";
        this.shape = LiteGraph.ROUND_SHAPE;
        this.addInput("in", 0);
    }
    PCNode.title = "PC";
    LiteGraph.registerNodeType("network/pc", PCNode);
}

const graph = new LGraph();
let canvas = null;
let selectedNode = null;

function initCanvas() {
    const container = document.getElementById('graph-canvas');
    if (!container) {
        console.error('Canvas container not found');
        return;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        setTimeout(initCanvas, 100);
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    container.width = rect.width * dpr;
    container.height = rect.height * dpr;
    container.style.width = rect.width + 'px';
    container.style.height = rect.height + 'px';

    canvas = new LGraphCanvas("#graph-canvas", graph);
    canvas.allow_searchbox = true;
    canvas.allow_interaction = true;
    canvas.allow_dragcanvas = true;
    canvas.allow_zoom = true;
    canvas.allow_reconnect_links = true;
    canvas.render_connections_border = true;
    canvas.render_curved_connections = true;
    canvas.render_connection_arrows = true;

    const ctx = container.getContext('2d');
    if (ctx) {
        ctx.scale(dpr, dpr);
    }

    window.addEventListener('resize', function() {
        const newRect = container.getBoundingClientRect();
        const newDpr = window.devicePixelRatio || 1;
        container.width = newRect.width * newDpr;
        container.height = newRect.height * newDpr;
        if (ctx) {
            ctx.scale(newDpr, newDpr);
        }
        canvas.resize();
    });

    registerNodeTypes();
    addInternetNode();
    bindCanvasEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCanvas);
} else {
    initCanvas();
}

function addInternetNode() {
    const node = LiteGraph.createNode("network/internet");
    if (node) {
        node.pos = [100, 100];
        graph.add(node);
        graph.setDirtyCanvas(true, true);
    }
}

function bindCanvasEvents() {
    graph.onNodeSelected = function(node) {
        selectedNode = node;
        updatePropertiesPanel(node);
    };

    graph.onNodeDeselected = function() {
        selectedNode = null;
        showEmptyState();
    };

    graph.onNodeConnectionChange = function() {
        if (selectedNode) {
            updatePropertiesPanel(selectedNode);
        }
    };
}

function showEmptyState() {
    document.getElementById('properties-panel').innerHTML = `
        <div class="empty-state">
            <p>Double-click to create nodes</p>
            <p style="margin-top: 10px; font-size: 12px;">Drag from output to input to connect</p>
        </div>
    `;
    document.getElementById('selected-node-type').textContent = '';
    document.getElementById('selected-node-type').className = 'node-type-badge';
}

function updatePropertiesPanel(node) {
    const type = node.type.split('/')[1];
    const p = node.properties;
    
    const typeBadge = document.getElementById('selected-node-type');
    typeBadge.textContent = type.toUpperCase();
    typeBadge.className = `node-type-badge node-type-${type}`;

    if (type === 'internet') {
        document.getElementById('properties-panel').innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${node.name}" disabled>
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">
                Internet root node
            </p>
        `;
        return;
    }

    let html = `
        <div class="form-group">
            <label>Node Name</label>
            <input type="text" id="prop-name" value="${p.name || ''}"
                   onchange="updateNodeProperty('name', this.value)">
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="prop-br" ${p.br ? 'checked' : ''}
                       onchange="updateNodeProperty('br', this.checked)">
                Enable Bridge (br)
            </label>
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="prop-vlan" ${p.vlan ? 'checked' : ''}
                       onchange="updateNodeProperty('vlan', this.checked)">
                Enable VLAN
            </label>
        </div>
    `;

    if (p.vlan) {
        html += `
            <div class="form-group">
                <label>VLAN ID</label>
                <input type="number" id="prop-vid" value="${p.vid || ''}"
                       onchange="updateNodeProperty('vid', parseInt(this.value) || 0)">
            </div>
        `;
    }

    html += `
        <div class="form-group">
            <label>LAN Address</label>
            <input type="text" id="prop-lan" value="${p.lan || ''}"
                   placeholder="e.g., 192.168.1.1"
                   onchange="updateNodeProperty('lan', this.value)">
        </div>

        <div class="form-group">
            <label>Interface Name (ifname)</label>
            <input type="text" id="prop-ifname" value="${p.ifname || ''}"
                   onchange="updateNodeProperty('ifname', this.value)">
        </div>

        <div class="form-group">
            <label>Parent Interface (ifname_parent)</label>
            <input type="text" id="prop-ifname_parent" value="${p.ifname_parent || ''}"
                   onchange="updateNodeProperty('ifname_parent', this.value)">
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="prop-forward" ${p.forward ? 'checked' : ''}
                       onchange="updateNodeProperty('forward', this.checked)">
                Enable IP Forwarding
            </label>
        </div>

        <div class="form-group">
            <label>Global Node ID (gid)</label>
            <input type="number" id="prop-gid" value="${p.gid >= 0 ? p.gid : ''}"
                   placeholder="For multi-WAN scenarios"
                   onchange="updateNodeProperty('gid', this.value ? parseInt(this.value) : -1)">
            <div class="help-text">Used for multi-link shared nodes</div>
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="prop-gw" ${p.gw ? 'checked' : ''}
                       onchange="updateNodeProperty('gw', this.checked)">
                As Gateway (gw)
            </label>
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="prop-disable" ${p.disable ? 'checked' : ''}
                       onchange="updateNodeProperty('disable', this.checked)">
                Disable Node
            </label>
        </div>

        <div class="form-group">
            <label>Exec Commands</label>
            <div class="exec-list" id="exec-list">
                ${renderExecList(p.exec || [])}
            </div>
            <button class="add-btn" onclick="addExecCommand()">+ Add Command</button>
        </div>
    `;

    document.getElementById('properties-panel').innerHTML = html;
}

function renderExecList(exec) {
    if (!exec || exec.length === 0) {
        return '<p style="color: #666; font-size: 11px;">No commands</p>';
    }
    return exec.map((cmd, idx) => `
        <div class="exec-item">
            <input type="text" value="${cmd}" 
                   onchange="updateExecCommand(${idx}, this.value)">
            <button onclick="removeExecCommand(${idx})">×</button>
        </div>
    `).join('');
}

function updateNodeProperty(key, value) {
    if (selectedNode) {
        selectedNode.properties[key] = value;
        if (key === 'name') {
            selectedNode.name = value;
            selectedNode.title = value;
        }
        graph.setDirtyCanvas(true, true);
    }
}

function addExecCommand() {
    if (selectedNode) {
        const exec = selectedNode.properties.exec || [];
        exec.push('');
        selectedNode.properties.exec = exec;
        document.getElementById('exec-list').innerHTML = renderExecList(exec);
    }
}

function updateExecCommand(index, value) {
    if (selectedNode) {
        selectedNode.properties.exec[index] = value;
    }
}

function removeExecCommand(index) {
    if (selectedNode) {
        const exec = selectedNode.properties.exec || [];
        exec.splice(index, 1);
        selectedNode.properties.exec = exec;
        document.getElementById('exec-list').innerHTML = renderExecList(exec);
    }
}

function exportJson() {
    const json = graphToRlabJson();
    if (!json) {
        alert('Export failed: No valid topology found');
        return;
    }

    const dataStr = JSON.stringify(json, null, 4);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rlab-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function graphToRlabJson() {
    const nodes = graph._nodes;
    
    let rootNode = null;
    for (const node of nodes) {
        if (node.type === 'network/internet') {
            rootNode = node;
            break;
        }
    }

    if (!rootNode) {
        return null;
    }

    const nodeMap = {};
    for (const node of nodes) {
        nodeMap[node.id] = node;
    }

    function buildNodeJson(node) {
        const type = node.type.split('/')[1];
        const p = node.properties || {};
        
        const result = {};
        
        if (type === 'internet') {
            result.name = 'internet';
        } else {
            result.name = p.name || type;
        }

        if (p.br) result.br = true;
        if (p.vlan) result.vlan = true;
        if (p.vid > 0) result.vid = p.vid;
        if (p.lan) result.lan = p.lan;
        if (p.ifname) result.ifname = p.ifname;
        if (p.ifname_parent) result.ifname_parent = p.ifname_parent;
        if (p.forward === false) result.forward = false;
        if (p.gid >= 0) result.gid = p.gid;
        if (p.gw) result.gw = true;
        if (p.disable) result.disable = true;
        if (p.exec && p.exec.length > 0) {
            result.exec = p.exec.filter(cmd => cmd.trim() !== '');
        }

        const children = [];
        if (node.outputs) {
            for (let i = 0; i < node.outputs.length; i++) {
                const output = node.outputs[i];
                if (output && output.links) {
                    for (const linkId of output.links) {
                        const link = graph.links[linkId];
                        if (link) {
                            const targetNode = nodeMap[link.target_id];
                            if (targetNode) {
                                children.push(targetNode);
                            }
                        }
                    }
                }
            }
        }

        if (children.length > 0) {
            result.nodes = children.map(child => buildNodeJson(child));
        }

        return result;
    }

    return { nodes: [buildNodeJson(rootNode)] };
}

function importJson(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target.result);
            rlabJsonToGraph(json);
        } catch (err) {
            alert('Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function rlabJsonToGraph(json) {
    graph.clear();

    if (!json.nodes || json.nodes.length === 0) {
        alert('Invalid rlab JSON file');
        return;
    }

    let nodeCounter = 0;

    function createNode(nodeData, parentNode, level, index, siblingCount) {
        let nodeType = 'network/pc';
        if (nodeData.name === 'internet') {
            nodeType = 'network/internet';
        } else if (nodeData.br && !nodeData.vlan) {
            nodeType = 'network/switch';
        } else if (nodeData.br || nodeData.nodes) {
            nodeType = 'network/router';
        }

        const node = LiteGraph.createNode(nodeType);
        if (!node) return null;
        
        const baseX = 200 + level * 250;
        const baseY = 200 + (index - (siblingCount - 1) / 2) * 150;
        node.pos = [baseX, baseY];

        node.name = nodeData.name;
        node.title = nodeData.name;
        
        if (nodeData.br !== undefined) node.properties.br = nodeData.br;
        if (nodeData.vlan !== undefined) node.properties.vlan = nodeData.vlan;
        if (nodeData.vid !== undefined) node.properties.vid = nodeData.vid;
        if (nodeData.lan !== undefined) node.properties.lan = nodeData.lan;
        if (nodeData.ifname !== undefined) node.properties.ifname = nodeData.ifname;
        if (nodeData.ifname_parent !== undefined) node.properties.ifname_parent = nodeData.ifname_parent;
        if (nodeData.forward !== undefined) node.properties.forward = nodeData.forward;
        if (nodeData.gid !== undefined) node.properties.gid = nodeData.gid;
        if (nodeData.gw !== undefined) node.properties.gw = nodeData.gw;
        if (nodeData.disable !== undefined) node.properties.disable = nodeData.disable;
        if (nodeData.exec !== undefined) node.properties.exec = nodeData.exec;

        graph.add(node);

        if (parentNode) {
            parentNode.connect(0, node, 0);
        }

        if (nodeData.nodes && nodeData.nodes.length > 0) {
            nodeData.nodes.forEach((child, idx) => {
                createNode(child, node, level + 1, idx, nodeData.nodes.length);
            });
        }

        return node;
    }

    createNode(json.nodes[0], null, 0, 0, 1);

    graph.setDirtyCanvas(true, true);
}
