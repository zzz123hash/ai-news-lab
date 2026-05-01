export function onRequestGet() {
	return json({
		ok: true,
		site: 'OmniHex Lab',
	});
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

