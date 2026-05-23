export const prerender = true;

export const GET = () =>
	new Response(
		JSON.stringify({
			linkset: [
				{
					anchor: 'https://bbfans.github.io/api/status.json',
					'service-desc': [
						{
							href: 'https://bbfans.github.io/openapi.json',
							type: 'application/openapi+json',
						},
					],
					'service-doc': [
						{
							href: 'https://bbfans.github.io/docs/api/',
							type: 'text/html',
						},
					],
					status: [
						{
							href: 'https://bbfans.github.io/api/status.json',
							type: 'application/json',
						},
					],
				},
			],
		}),
		{
			headers: {
				'Content-Type': 'application/linkset+json; charset=utf-8',
			},
		},
	);
