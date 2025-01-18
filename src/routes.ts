import { view } from "./templates.ts";
import * as router from "./router.ts";
import { MimeType } from "./mimetypes.ts";

export default async function getRoutes() {
	const [error, home, register] = await Promise.all([
		view("/error.hbs"),
		view("/view.hbs"),
		view("/register.hbs"),
	]);
	router.setErrorPage(error);
	router.templ("/", home);
	router.post("/", async (request) => {
		const formData = await request.formData();
		return new Response(JSON.stringify(Object.fromEntries(formData)), {
			headers: { "content-type": MimeType.Json },
		});
	});
	router.templ("/register", register);
	router.post("/", async (request) => {
		const formData = await request.formData();
		return new Response(JSON.stringify(Object.fromEntries(formData)), {
			headers: { "content-type": MimeType.Json },
		});
	});
	router.any("/test/", (req, groups) => {
		const params = new URL(req.url).searchParams;
		let buffer = JSON.stringify(Array.from(params.entries()));
		return new Response(buffer, {
			headers: {
				"content-type": MimeType.Json,
			},
		});
	});
}
