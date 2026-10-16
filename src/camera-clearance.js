// Keep every near-plane corner inside the walker's collision clearance, even
// when a phone rotates or the camera looks obliquely along a wall.
export function interiorNearPlane(fov, aspect, radius) {
 const halfHeight=Math.tan(fov*Math.PI/360);
 const cornerScale=Math.hypot(1,halfHeight,halfHeight*aspect);
 return Math.min(.08,radius*.5/cornerScale);
}
