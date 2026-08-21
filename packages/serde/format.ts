/*

                    THE IMMEDIATE MODULE FORMAT SPECIFICATION (v0.0.1)
                    ==================================================

        This document describes the Immediate Module (IMM) format, a fairly efficient
    way of storing information about immediate user interfaces on the web based on the
    HTML DOM which can be used to achieve real-time user interface streaming. IMM is
    tailored for htim (https://github.com/AWeirdDev/htim), a minimalist, immediate
    mode-based web framework for everyone, but can be used anywhere.

        Please do note that this is not an official paper. The sole purpose of this is
    to not make myself forget too much about this as time passes. I have great passion
    and enthusiasm in this project, but sometimes I might lose that feeling. By leaving
    this document here, I can revisit whenever I feel like it. I like to say this is
    sort of like my personal "chronicle."



    1.1 - BASIC FORMATS
    -------------------

        Integer endianess: LITTLE ENDIAN
              size_t type: UINT32 (4 bytes)
          String encoding: UTF-8

    1.2 - TAGS
    ----------

        Tags tell the deserializer what to expect later in the data stream, such as
    text nodes, or a series of nodes. They can also be interpreted as instructions,
    telling the deserializer what to do exactly the moment they're read.

        As of now, there are 5 tags:

        (0) TEXT
            Tells the deserializer the next expected data is a text node.

        (1) FRAGMENT
            Tells the deserializer the next expected data is a fragment containing
            (potentially) multiple nodes.

        (2) ELEMENT
            Tells the deserializer the next expected data is an HTML element.

        (3) ATTRIBUTES
            Tells the deserializer the next expected data is going to be specifying
            the attributes of the current element.

        (4) RENDERUP
            Instructs the deserializer that the contents (body) of the current node has
            been concluded, and that we can now process the next item.



    2.1 - TEXT
    ----------

        [ (uint8) 0 ] [ (size_t) Size of the utf-8 string ] [ (uint8[]) Text string bytes ]

    2.2 - FRAGMENT
    --------------

        [ (uint8) 1 ] [ (uint8[]) ...any... ] [ (uint8) 4* ]

        *: SerdeTag.RENDERUP

    2.3 - ELEMENT
    -------------

        [ (uint8) 2 ] [ (size_t) Size of the tag in utf-8 ] [ (uint8[]) Tag string bytes ]...
        ...[ (uint8[]) ...any... ] [ (uint8) 4* ]

        *: SerdeTag.RENDERUP

    2.4 - ATTRIBUTES
    ----------------

        [ (uint8) 3 ] [ (size_t) # of attributes, let it be N ]...

        ...for i in range(N):
            [  (size_t) Size of key i in utf-8  ]
            [ (size_t) Size of value i in utf-8 ]...

        ...for i in range(N):
            [  (uint8[]) Key i string bytes  ]
            [ (uint8[]) Value i string bytes ]

        Note that the sizes appear first in order to make the serialization process
    a lot more efficient (reducing the cost of "fragmentation," which some might refer
    to it as).



    3.1 - SIMPLE EXAMPLE
    --------------------

    In HTML:

        <div>
            Hello, <a href="/world">World</a>
        </div>

    In immediate mode:

        const div = parent.div();

        div._("Hello, ");
        div.a("World", { href: "/world" });


    In the IMM format (for visualization purposes only):

        ELEMENT
            3                       # size of "div"
            ...                     # "div" in bytes
            TEXT
                7                   # size of "Hello, "
                ...                 # "Hello, " in bytes
            ELEMENT
                1                   # size of "a"
                ...                 # "a" in bytes
                TEXT
                    5               # size of "World"
                    ...             # "World" in bytes
                ATTRIBUTES
                    1               # number of attributes
                    4               # key "href" size
                    6               # value "/world" size
                    ...             # "href" in bytes
                    ...             # "/world" in bytes
            RENDERUP                # </a>
        RENDERUP                    # </div>



    CHANGELOG
    ---------
    v0.0.2+spec-0.0.1 (2026-08-21) - Initial specification publication.
    v0.0.1            (2026-08-11) - Initial release.


    LICENSING
    ---------
    MIT or UNLICENSED (https://unlicense.org/), at your option. For more information,
    visit the GitHub page (https://github.com/AWeirdDev/htim).
 */

/**
 * A tag whichs tells you what data type is expected later,
 * or serves as an instruction telling the deserializer
 * what to do.
 *
 * For more information, check the documentation for each tag.
 */
export enum SerdeTag {
    /**
     * Tells the deserializer the next expected data
     * is a text node.
     */
    TEXT = 0,

    /**
     * Tells the deserializer the next expected data
     * is a fragment containing (potentially) multiple
     * nodes.
     */
    FRAGMENT,

    /**
     * Tells the deserializer the next expected data
     * is an HTML element.
     */
    ELEMENT,

    /**
     * Tells the deserializer the next expected data
     * is going to be specifying the attributes of the
     * current element.
     */
    ATTRIBUTES,

    /**
      * Instructs the deserializer that the contents
      * (body) of the current node has been concluded,
      * and that we can now process the next item.
      */
    RENDERUP,

    // Deprecated:
    // DOWN,
    //
    // This is no longer needed because this data format
    // is already self-explanatory enough for the
    // deserializer to omit `DOWN` instructions.
}

export const SIZE_UINT8: number = 8 >> 3;    // 1 byte
export const SIZE_UINT32: number = 32 >> 3;  // 4 bytes

/**
------------------------------------------------------------------------------
This software is available under 2 licenses -- choose whichever you prefer.
------------------------------------------------------------------------------
ALTERNATIVE A - MIT License
Copyright (c) 2026 AWeirdDev <awdjared@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
------------------------------------------------------------------------------
ALTERNATIVE B - Public Domain (www.unlicense.org)
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
------------------------------------------------------------------------------
*/
