
pomngUI.panel.registry = function(elem) {

	this.elem = elem;
	
	this.elem.html('<div id="registry_tree" class="ui-widget ui-widget-content ui-corner-all"></div><div id="registry_content">Click on an item for details</div>');
	this.tree = this.elem.find('#registry_tree');
	this.tree.jstree({
		"core" : {
			"multiple" : false,
			"check_callback" : true,
			"themes" : {
				"icons": false,
			},
		},
		"plugins" : [ "sort" ]
	});

	this.content = this.elem.find('#registry_content');

	var self = this;
	this.content.delegate("a#inst_add", "click", function(event) {
		var inst_name = this.text;
		pomngUI.dialog.instanceAdd(self.selected_class, inst_name);
	})

	var clss_name = Object.keys(pomng.registry.classes);

	var tree = this.tree.jstree(true);
	this.tree.on('changed.jstree', this.node_changed.bind(this));

	for (var i = 0; i < clss_name.length; i++) {
		var cls = pomng.registry.classes[clss_name[i]];
		
		tree.create_node('#', { id: 'registry_tree_cls_' + cls.name, text: cls.name } , 'last');

		var instances_name = Object.keys(cls.instances).sort();
		for (var j = 0; j < instances_name.length; j++)
			tree.create_node('registry_tree_cls_' + cls.name, { id: 'registry_tree_inst_' + cls.name + '_' + instances_name[j], text: instances_name[j] }, 'last');

	}

	window.addEventListener("pomng.registry.instance.update", function(event) {
		self.evtUpdateInstance(event.detail.cls_name, event.detail.instance_name);
	});

	window.addEventListener("pomng.registry.instance.remove", function(event) {
		self.evtRemoveInstance(event.detail.cls_name, event.detail.instance_name);
	});

}

pomngUI.panel.registry.prototype = new pomngUI.panel();
pomngUI.panel.registry.prototype.constructor = pomngUI.panel.registry;

pomngUI.panel.registry.prototype.node_changed = function(e, data) {

	var node = data.node;

	var cls_name;
	var inst_name;

	if (node.parents.length > 1) {
		// This is an instance
		var par = data.instance.get_node(node.parent);
		cls_name = par.text;
		inst_name = node.text;
		this.selected_class = cls_name;
		this.selected_instance = inst_name;
		this.instanceDetail(cls_name, inst_name);
	} else {
		// This is a class
		cls_name = node.text;
		this.selected_class = cls_name;
		delete this.selected_instance;
		this.classDetail(cls_name);
	}
}

pomngUI.panel.registry.prototype.classDetail = function(cls_name) {

	var html = '<h2 class="registry_details">Class ' + cls_name + '</h2>';

	var cls = pomng.registry.classes[cls_name];


	// Show the parameters
	var params_name = Object.keys(cls.parameters).sort();

	html += '<h3 class="registry_details">Parameters :</h3>';

	if (params_name.length > 0) {
		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Value</td><td>Type</td><td>Description</td></tr></thead><tbody>';
		for (var i = 0; i < params_name.length; i++) {
			var param = cls.parameters[params_name[i]];
			html += '<tr><td>' + param.name + '</td><td>' + pomng.htmlEscape(param.value) + '</td><td>' + pomng.htmlEscape(param.type) + '</td><td>' + pomng.htmlEscape(param.description) + '</td></tr>';
		}

		html += '</tbody></table>';

		} else {
		html += '<div>No parameter for this class</div>';
	}

	// Show the available instance types
	
	var types_name = Object.keys(cls.available_types).sort();
	if (types_name.length > 0) {
		html += '<h3 class="registry_details">Available instance types :</h3><table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Description</td></tr></thead><tbody>';
		for (var i = 0; i < types_name.length; i++) {
			var type = cls.available_types[types_name[i]];
			html += '<tr><td><a href="#" id="inst_add">' + type.name + '</a></td><td>' + pomng.htmlEscape(type.description) + '</td></tr>';
		}
		html += '</tbody></table>';
	}


	// Show the instances
	html += '<h3 class="registry_details">Instances :</h3>';

	var instances_name = Object.keys(cls.instances).sort();

	if (instances_name.length > 0) {
		
		var inst1_params = cls.instances[instances_name[0]].parameters;
		var has_type = false;
		var has_running = false;
		var has_uid = false;

		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td>';
		
		if (inst1_params['type'] !== undefined) {
			html += '<td>Type</td>';
			has_type = true;
		}
			
		if (inst1_params['running'] !== undefined) {
			html += '<td>Running</td>';
			has_running = true;
		}

		if (inst1_params['uid'] !== undefined) {
			html += '<td>UID</td>';
			has_uid = true;
		}
			
		// html += '<td>Description</td>';
		
		html += '</tr></thead><tbody>';

		for (var i = 0; i < instances_name.length; i++) {
			var inst = cls.instances[instances_name[i]];
			html += '<tr><td>' + inst.name + '</td>';

			if (has_type)
				html += '<td>' + inst.parameters['type'].value + '</td>';
			
			if (has_running)
				html += '<td>' + inst.parameters['running'].value + '</td>';
			
			if (has_uid)
				html += '<td>' + inst.parameters['uid'].value + '</td>'
			
			html += '</tr>';
		}

		html += '</tbody></table>';

	} else {
		html += '<div>No instances for this class</div>';
	}

	// Show the performances
	html += '<div><h3 class="registry_details">Performance objects :</h3>';

	var perfs_name = Object.keys(cls.performances).sort();

	var perfs_to_fetch = [];

	if (perfs_name.length > 0) {

		html += '<span class="ui-icon ui-icon-refresh icon-btn" id="btn_perf_refresh" title="Refresh"></span></div>';

		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Type</td><td>Value</td><td>Unit</td><td>Description</td></tr></thead><tbody>';

		for (var i = 0; i < perfs_name.length; i++) {
			var perf = cls.performances[perfs_name[i]];
			html += '<tr><td>';
			if (perf.type != "timeticks") {
				html += '<a href="javascript:pomngUI.perf.addDialog(\'' + cls_name + '.' + perf.name + '\')">' + perf.name + '</a>';
			} else {
				html += perf.name;
			}
			html += '</td><td>' + perf.type + '</td><td id="td_perf_cls_' + cls.name + '_' + perf.name + '">Fetching ...</td><td>' + perf.unit + '</td><td>' + pomng.htmlEscape(perf.description) + '</td></tr>';
			perfs_to_fetch.push({class: cls.name, perf: perf.name});
		}
		html += '</tbody></table>';

	} else {
		html += '</div><div>No performance object for this class</div>';
	}

	this.content.html(html);
	var self = this;
	this.content.find("#btn_perf_refresh").click(function() {
		self.refreshPerf(cls.name)
	});

	pomng.call("registry.getPerfs", this.updatePerf, [ perfs_to_fetch ], this);
}

pomngUI.panel.registry.prototype.instanceDetail = function(cls_name, inst_name) {

	var html = '<h2 class="registry_details">Instance ' + inst_name + ' from class ' + cls_name + '</h2>';

	var inst = pomng.registry.classes[cls_name].instances[inst_name];

	var params_name = Object.keys(inst.parameters).sort();

	html += '<h3 class="registry_details">Parameters :</h3>';

	if (params_name.length > 0) {
		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Value</td><td>Type</td><td>Description</td></tr></thead><tbody>';
		for (var i = 0; i < params_name.length; i++) {
			var param = inst.parameters[params_name[i]];
			html += '<tr><td>' + param.name + '</td><td>' + pomng.htmlEscape(param.value) + '</td><td>' + param.type + '</td><td>' + pomng.htmlEscape(param.description) + '</td></tr>';
		}

		html += '</tbody></table>';

	} else {
		html += '<div>No parameter for this instance</div>';
	}

	// Show the performances
	html += '<div><h3 class="registry_details">Performance objects :</h3>';

	var perfs_name = Object.keys(inst.performances).sort();

	var perfs_to_fetch = [];

	if (perfs_name.length > 0) {
		html += '<span class="ui-icon ui-icon-refresh icon-btn" title="Refresh" id="btn_perf_refresh"></span></div>';

		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Type</td><td>Value</td><td>Unit</td><td>Description</td></tr></thead><tbody>';

		for (var i = 0; i < perfs_name.length; i++) {
			var perf = inst.performances[perfs_name[i]];
			html += '<tr><td>';
			if (perf.type != "timeticks") {
				html += '<a href="javascript:pomngUI.perf.addDialog(\'' + cls_name + '.' + inst.name + '.' + perf.name + '\')">' + perf.name + '</a>';
			} else {
				html += perf.name;
			}
			html += '</td><td>' + perf.type + '</td><td id="td_perf_inst_' + cls_name + '_' + inst.name + '_' + perf.name + '">Fetching ...</td><td>' + perf.unit + '</td><td>' + pomng.htmlEscape(perf.description) + '</td></tr>';
			perfs_to_fetch.push({class: cls_name, instance: inst_name, perf: perf.name});
		}
		html += '</tbody></table>';

	} else {
		html += '</div><div>No performance object for this class</div>';
	}

	this.content.html(html);
	var self = this;
	this.content.find("#btn_perf_refresh").click(function() {
		self.refreshPerf(cls_name, inst_name)
	});

	pomng.call("registry.getPerfs", this.updatePerf, [ perfs_to_fetch ], this);
}


pomngUI.panel.registry.prototype.evtUpdateInstance = function(cls_name, inst_name) {

	var tree = this.tree.jstree(true);
	var node = tree.get_node('registry_tree_inst_' + cls_name + '_' + inst_name);

	if (node)
		return;

	tree.create_node('registry_tree_cls_' + cls_name, { id: 'registry_tree_inst_' + cls_name + '_' + inst_name, text: inst_name }, 'last');

}

pomngUI.panel.registry.prototype.evtRemoveInstance = function(cls_name, inst_name) {
	
	var tree = this.tree.jstree(true);
	var node = tree.get_node('registry_tree_inst_' + cls_name + '_' + inst_name);

	if (!node)
		return;

	var selected = tree.is_selected(node);
	if (selected) {
		tree.deselect_node(node, true);
		tree.select_node(node.parent, true);
	}

	tree.delete_node(node);

}

pomngUI.panel.registry.prototype.refreshPerf = function(cls_name, inst_name) {

	var perfs;

	if (inst_name !== undefined) {
		perfs = pomng.registry.classes[cls_name].instances[inst_name].performances;
	} else {
		perfs = pomng.registry.classes[cls_name].performances;
	}
	
	var perfs_to_fetch = [];

	var perfs_name = Object.keys(perfs).sort();

	if (perfs_name.length < 0)
		return;

	for (var i = 0; i < perfs_name.length; i++) {
		var perf = perfs[perfs_name[i]];

		var elem = '#td_perf_';
		if (inst_name !== undefined) {
			elem += 'inst_' + cls_name + '_' + inst_name;
		} else {
			elem += 'cls_' + cls_name;
		}
		elem += '_' + perf['name'];

		this.content.find(elem).html('Refreshing ...');


		if (inst_name !== undefined) {
			perfs_to_fetch.push({class: cls_name, instance: inst_name, perf: perf.name});
		} else {
			perfs_to_fetch.push({class: cls_name, perf: perf.name});
		}
	}

	pomng.call("registry.getPerfs", this.updatePerf, [ perfs_to_fetch ], this);

}

pomngUI.panel.registry.prototype.updatePerf = function(response, status, jqXHR) {
	
	var perfs = response[0];
	var perf_names = Object.keys(perfs);

	for (var i = 0; i < perf_names.length; i++) {
		var perf = perfs[perf_names[i]];
		var elem = '#td_perf_';
		if ('instance' in perf) {
			elem += 'inst_' + perf['class'] + '_' + perf['instance'];
		} else {
			elem += 'cls_' + perf['class'];
		}
		elem += '_' + perf['perf'];

		this.content.find(elem).html(perf['value']);
	}

}

