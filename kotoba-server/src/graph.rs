use crate::app::App;

pub struct Context {
	pub app: &'static App,
}

impl juniper::Context for Context {}

/// Root Query for the GraphQL schema.
pub struct Query;

#[graphql_object(Context = Context)]
impl Query {
	/// Server version.
	fn app() -> &'static str {
		"Kotoba Server"
	}
}

/// Root Mutation for the GraphQL schema.
pub struct Mutation;

#[graphql_object(Context = Context)]
impl Mutation {
	/// Dummy operation.
	fn no_op() -> i32 {
		42
	}
}

/// Root schema for GraphQL.
pub type Schema = juniper::RootNode<'static, Query, Mutation, juniper::EmptySubscription<Context>>;
