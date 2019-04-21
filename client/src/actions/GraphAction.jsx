import { backendURI } from '../keys.js';
import BinaryTree from '../structures/BinaryTree.jsx';

export function updateGraphInfo(graphInfo) {
	return function(dispatch) {
		dispatch({
			type: 'G-update-info',
			payload: graphInfo
		})
	}
}

export function updateForm(form) {
	return function(dispatch) {
		dispatch({
			type: 'G-update-form',
			payload: form
		})
	}
}

export function loadGraphs(principal) {
	return async function(dispatch) {
		const res = await fetch(backendURI + '/api/graphs', {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Content-Type' : 'application/json',
				'Accept' : 'application/json',
				'x-auth-token' : principal.token
			}
		})
		.then(
			async res => {
				return {
					status: res.status,
					json: await res.json()
				}
			}
		)
		
		if (res !== undefined && res.status === 200 && Array.isArray(res.json)) {
			dispatch({
				type: 'G-update-list',
				payload: res.json
			})
		}
	}
}

export function load(graph) {
	return function(dispatch) {
		const vertices = graph.vertices;
		var tree = new BinaryTree();

		dispatch({
			type: 'VT-update-list',
			payload: vertices
		});
		
		const edges = graph.edges;

		var weights = [], prev = [];
		var verticesData = vertices.map((v) => {
			prev.push([]);
			tree.add(v.data);

			return v.data;
		});

		dispatch({
			type: 'VT-update-tree',
			payload: tree
		});

		const length = vertices.length;

		for (var i of verticesData.keys()) {
			weights.push([]);

			for (var j = 0; j < length; j++) {
				weights[i].push(Infinity);
			}
		}
		
		dispatch({
			type: 'ED-update-list',
			payload: translateEdgesModelToObj(edges, vertices)
		});

		var v1, v2, i1, i2;

		for (var e of edges) {
			v1 = e.v1;
			v2 = e.v2;
			i1 = verticesData.indexOf(v1.data);
			i2 = verticesData.indexOf(v2.data);
			weights[i1][i2] = e.weight;
			weights[i2][i1] = e.weight;
		}

		dispatch({
			type: 'ED-update-weights',
			payload: weights
		});

		dispatch({
			type: 'DS-update-prev',
			payload: prev
		});

		dispatch({
			type: 'G-update-info',
			payload: {
				id: graph._id,
				name: graph.name
			}
		})
	}
}

export function save(principal, vertices, edges, graphInfo) {
	return async function(dispatch) {
		if (!principal || !graphInfo) {
			return ;
		}

		const res = await fetch(backendURI + '/api/graphs', {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Content-Type' : 'application/json',
				'Accept' : 'application/json',
				'x-auth-token' : principal.token
			},
			body: JSON.stringify({
				vertices: vertices,
				edges: translateEdgesObjToModel(edges, vertices),
				name: graphInfo.name,
				id: graphInfo.id
			})
		})
		.then(
			async res => {
				return {
					json: await res.json(),
					status: res.status
				}
			},
			err => console.log(err)
		)

		graphInfo.msg = res.json.msg;

		dispatch({
			type: 'G-update-info',
			payload: graphInfo
		})
	}
}

export function deleteGraph(principal, graphInfo, id, callback) {
	return async function(dispatch) {
		const res = await fetch(backendURI + '/api/graphs', {
			method: 'DELETE',
			mode: 'cors',
			headers: {
				'Content-Type' : 'application/json',
				'Accept' : 'application/json',
				'x-auth-token' : principal.token
			},
			body: JSON.stringify({
				id: id
			})
		})
		.then(
			async res => {
				return {
					status: res.status,
					json: await res.json()
				}
			}
		)

		graphInfo.msg = res.json.msg;

		dispatch({
			type: 'G-update-info',
			payload: graphInfo
		});

		if (res.status === 200) {
			dispatch({
				type: 'G-update-form',
				payload: {
					target: null,
					name: ''
				}
			});

			if (callback !== null) {
				callback();
			}
		}
	}
}

function translateEdgesObjToModel(edges, vertices) {
	var translatedEdges = [];
	var verticesData = vertices.map((v) => { return v.data });

	for (var e of edges) {
		translatedEdges.push({
			tx: e.tx,
			ty: e.ty,
			weight: e.weight,
			v1: vertices[verticesData.indexOf(e.i1)],
			v2: vertices[verticesData.indexOf(e.i2)],
		})
	}

	return translatedEdges;
}

function translateEdgesModelToObj(edges, vertices) {
	var v1, v2;
	var translatedEdges = [];

	for (var e of edges) {
		v1 = e.v1;
		v2 = e.v2;

		translatedEdges.push({
			tx: (v1.left + v2.left) / 2,
			ty: (v1.top + v2.top) / 2,
			i1: v1.data,
			i2: v2.data,
			x1: v1.left,
			x2: v2.left,
			y1: v1.top,
			y2: v2.top,
			weight: e.weight
		});
	}

	return translatedEdges;
}