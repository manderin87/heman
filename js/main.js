'using strict';

var heman = CreateHeman();

heman.Buffer.prototype.data = function() {
    return heman.HEAPF32.subarray(this.begin(), this.end());
};

$('#menu-toggle').click(function() {
    $('nav').toggle();
    GIZA.refreshSize();
});

$(function() {

    var SIZE = 512;
    var DOFIT = true;
    var GL = GIZA.init();
    var M4 = GIZA.Matrix4;
    var C4 = GIZA.Color4;
    var V2 = GIZA.Vector2;

    GIZA.refreshSize();
    GL.getExtension('OES_texture_float');
    GL.getExtension('OES_texture_float_linear');

    var attribs = {
        POSITION: 0,
        TEXCOORD: 1,
    };

    var programs = GIZA.compile({
        color: {
          vs: ['simplevs'],
          fs: ['colorfs'],
          attribs: {
            Position: attribs.POSITION,
            TexCoord: attribs.TEXCOORD,
          }
        },
        gray: {
          vs: ['simplevs'],
          fs: ['grayfs'],
          attribs: {
            Position: attribs.POSITION,
            TexCoord: attribs.TEXCOORD,
          }
        }
    });

    var vertexBuffer = GL.createBuffer();
    var gradient = null;
    var texture = null;
    var dirty = false;
    var program = programs.gray;

    GIZA.refreshSize = function() {
        var w, h;
        if (DOFIT) {
            w = h = SIZE / window.devicePixelRatio;
        } else {
            var $container = $('.canvas-container');
            w = $container.width();
            h = $container.height();
        }
        GIZA.canvas.width = w * window.devicePixelRatio;
        GIZA.canvas.height = h * window.devicePixelRatio;
        GIZA.canvas.style.width = w + 'px';
        GIZA.canvas.style.height = h + 'px';
        GIZA.aspect = w / h;
        dirty = true;
    };

    var refresh = function() {
        GIZA.refreshSize();
    };

    $('#perlin').click(function() {
        var frequency = 4;
        var amplitude = 1;
        var octaves = 10;
        var lacunarity = 2;
        var gain = 0.65;
        var seed = Math.floor(Math.random() * 1000);
        var elev = heman.Generate.simplex_fbm(
            SIZE, SIZE, frequency, amplitude, octaves, lacunarity, gain, seed);
        texture = texture || GL.createTexture();
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.LUMINANCE, elev.width(), elev.height(), 0, GL.LUMINANCE, GL.FLOAT, elev.data());
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
        heman.Image.destroy(elev);
        program = programs.gray;
        refresh();
    });

    $('#island').click(function() {
        var seed = Math.floor(Math.random() * 1000);
        var hmap = heman.Generate.island_heightmap(SIZE, SIZE, seed);
        var elev = heman.Ops.normalize_f32(hmap, -0.5, 0.5);
        heman.Image.destroy(hmap);
        texture = texture || GL.createTexture();
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.LUMINANCE, elev.width(), elev.height(), 0, GL.LUMINANCE, GL.FLOAT, elev.data());
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
        heman.Image.destroy(elev);
        program = programs.color;
        refresh();
    });

    $('#lighting').click(function() {
        var seed = Math.floor(Math.random() * 1000);
        var hmap = heman.Generate.island_heightmap(SIZE, SIZE, seed);
        var elev = heman.Ops.normalize_f32(hmap, -0.5, 0.5);
        heman.Image.destroy(hmap);
        var rgb = heman.Lighting.apply(elev, 1, 1, 0.5);
        heman.Image.destroy(elev);
        texture = texture || GL.createTexture();
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, rgb.width(), rgb.height(), 0, GL.RGB, GL.FLOAT, rgb.data());
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
        heman.Image.destroy(rgb);
        program = programs.gray;
        refresh();
    });

    // Set up a description of the vertex format.
    var bufferView = new GIZA.BufferView({
      p: [Float32Array, 2],
      t: [Float32Array, 2],
    });

    // Allocate and populate the ArrayBuffer.
    var vertexArray = bufferView.makeBuffer(4);
    var iterator = bufferView.iterator();

    var vertex;
    vertex = iterator.next(); V2.set(vertex.p, [-1, -1]); V2.set(vertex.t, [0, 0]);
    vertex = iterator.next(); V2.set(vertex.p, [-1, 1]); V2.set(vertex.t, [0, 1]);
    vertex = iterator.next(); V2.set(vertex.p, [1, -1]); V2.set(vertex.t, [1, 0]);
    vertex = iterator.next(); V2.set(vertex.p, [1, 1]); V2.set(vertex.t, [1, 1]);

    // Create the vertex buffer object etc.
    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, vertexArray, GL.STATIC_DRAW);
    GL.clearColor(0.6, 0.6, 0.6, 1.0);
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);

    var mv = M4.scale(DOFIT ? 1.0 : 0.8);

    var img = new Image();
    img.src = 'img/terrain.png';
    img.onload = function() {
        gradient = GL.createTexture();
        GL.bindTexture(GL.TEXTURE_2D, gradient);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA,
            GL.UNSIGNED_BYTE, img);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
        dirty = true;
    };

    var draw = function(currentTime) {
        if (!texture || !dirty || !gradient) {
            return;
        }
        dirty = false;

        var proj = M4.orthographic(
            -GIZA.aspect, GIZA.aspect, // left right
            -1, +1, // bottom top
            0, 100);  // near far

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, gradient);
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.clear(GL.COLOR_BUFFER_BIT);
        GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
        GL.enableVertexAttribArray(attribs.POSITION);
        GL.vertexAttribPointer(attribs.POSITION, 2, GL.FLOAT, false, 16, 0);
        GL.enableVertexAttribArray(attribs.TEXCOORD);
        GL.vertexAttribPointer(attribs.TEXCOORD, 2, GL.FLOAT, false, 16, 8);
        GL.useProgram(program);
        GL.uniformMatrix4fv(program.projection, false, proj);
        GL.uniformMatrix4fv(program.modelview, false, mv);
        GL.uniform1i(program.gradient, 1);
        GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
    };

    GIZA.animate(draw);
});