use actix_web as web;

use crate::app::App;
use crate::graph;
use crate::graphql;

#[get("/")]
async fn hello() -> impl web::Responder {
	web::HttpResponse::Ok().body("Kotoba server")
}

pub async fn launch<A: std::net::ToSocketAddrs>(
	app: &'static App,
	bind_addr: A,
) -> std::io::Result<()> {
	web::HttpServer::new(move || {
		web::App::new()
			.data(graph::Schema::new(
				graph::Query,
				graph::Mutation,
				juniper::EmptySubscription::new(),
			))
			.data(app)
			.service(hello)
			.service(
				web::web::scope("/api")
					.service(graphql::ide)
					.service(graphql::query)
					.service(graphql::query_get),
			)
	})
	.bind(bind_addr)?
	.run()
	.await
}
