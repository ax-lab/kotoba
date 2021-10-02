// For rocket:
#![feature(proc_macro_hygiene)]
#![feature(decl_macro)]
// TODO: remove this
#![allow(dead_code)]
#![allow(unused_imports)]

#[macro_use]
extern crate lazy_static;

#[macro_use]
extern crate serde;
extern crate serde_json;

#[macro_use]
extern crate actix_web;
#[macro_use]
extern crate juniper;

mod app;
mod graph;
mod graphql;
mod server;

#[actix_web::main]
pub async fn main() {
	let addr = "127.0.0.1:9086";
	println!("inf: running server at {}...", addr);
	match server::launch(app::App::get(), addr).await {
		Ok(()) => (),
		Err(e) => eprintln!("err: {}", e),
	};
}
