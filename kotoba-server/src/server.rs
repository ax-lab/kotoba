use crate::app::App;
use crate::graph;
use crate::graphql;

use rocket_contrib::json::Json;

#[derive(Serialize)]
struct IndexInfo {
	name: &'static str,
	ok: bool,
}

#[get("/")]
fn index() -> Json<IndexInfo> {
	let out = IndexInfo {
		name: "Kotoba Server",
		ok: true,
	};
	Json(out)
}

pub fn launch(app: &'static App) {
	rocket::ignite()
		.manage(app)
		.manage(graph::Schema::new(
			graph::Query,
			graph::Mutation,
			juniper::EmptySubscription::new(),
		))
		.mount("/", routes![index])
		.mount(
			"/api",
			routes![graphql::query, graphql::query_get, graphql::ide],
		)
		.launch();
}
