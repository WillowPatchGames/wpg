package acl

type AuthLevel string

const (
	Unauthed AuthLevel = "none"
	AnyAuth AuthLevel = "any"
	SelfAuth AuthLevel = "self"
)

var EndpointAuthMath = map[string]AuthLevel {
	"/users": Unauthed,
	"/user":  AnyAuth,
	"/auth":  SelfAuth,
}
