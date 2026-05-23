(function () {
	const modelContext = navigator.modelContext;
	if (!modelContext) return;

	const absoluteUrl = (path) => new URL(path, window.location.origin).toString();
	const abortController = new AbortController();

	const tools = [
		{
			name: 'open_blog_page',
			description: 'Open the bbfans blog index.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false
			},
			execute: async () => {
				window.location.href = absoluteUrl('/blog/');
				return { url: absoluteUrl('/blog/') };
			}
		},
		{
			name: 'open_projects_page',
			description: 'Open the bbfans projects index.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false
			},
			execute: async () => {
				window.location.href = absoluteUrl('/projects/');
				return { url: absoluteUrl('/projects/') };
			}
		},
		{
			name: 'get_site_discovery',
			description: 'Return public Agent Native discovery URLs for this site.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false
			},
			execute: async () => ({
				homepage: absoluteUrl('/'),
					robots: absoluteUrl('/robots.txt'),
					apiCatalog: absoluteUrl('/.well-known/api-catalog'),
					openapi: absoluteUrl('/openapi.json'),
					status: absoluteUrl('/api/status.json'),
					agentSkills: absoluteUrl('/.well-known/agent-skills/index.json'),
					mcpServerCard: absoluteUrl('/.well-known/mcp/server-card.json')
				})
		}
	];

	if (typeof modelContext.registerTool === 'function') {
		tools.forEach((tool) => {
			modelContext.registerTool(tool, { signal: abortController.signal });
		});
		window.addEventListener('pagehide', () => abortController.abort(), { once: true });
		return;
	}

	if (typeof modelContext.provideContext !== 'function') return;

	modelContext.provideContext({
		name: 'bbfans.github.io',
		description: 'Agent tools for bbfans projects, posts, and discovery metadata.',
		tools
	});
})();
