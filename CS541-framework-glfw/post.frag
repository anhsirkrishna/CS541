//Gbuffer rendering vertex shader

#version 430

uniform sampler2D renderBuffer;
uniform sampler2D bloomBuffer;
uniform sampler2D upsampleBuffer;

uniform int drawFbo;

uniform int width, height;
uniform float exposure;
uniform float tone_mapping_mode;
uniform float gamma;

uniform int bloomEnabled;
uniform int bloomMode;
uniform float bloomFactor;

uniform float bloom_mip_level;

layout(location = 0) out vec4 out_color;

void main() {
	vec2 uv = gl_FragCoord.xy / vec2(width, height);
	vec4 fragColor = texture(renderBuffer, uv);
	vec4 bloomColor;
	if (bloomMode == 0)
		bloomColor = texture(upsampleBuffer, uv);
	else
		bloomColor = texture(bloomBuffer, uv);

	if (drawFbo < 13){
		out_color = fragColor;
		return;
	}
	if (drawFbo == 13){
		out_color = textureLod(bloomBuffer, uv, bloom_mip_level);
	}
	else if (drawFbo == 14){
		out_color = textureLod(upsampleBuffer, uv, bloom_mip_level);
	}
	else {
		if (bloomEnabled == 1)
			fragColor = fragColor + (bloomColor*bloomFactor);

		if (tone_mapping_mode == 0)
			fragColor.rgb = (exposure*fragColor.rgb)/(exposure*fragColor.rgb + 1);
		else
			fragColor.rgb = vec3(1.0) - exp(-fragColor.rgb*exposure);

		//Convert color back into sRGB space
		fragColor.rgb = pow(fragColor.rgb, vec3(1.0f/gamma));
		out_color = vec4(fragColor.rgb, 1.0);
	}
}