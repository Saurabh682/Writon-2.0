package com.ibitvalley.writon.classes;

import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Iterator;

/**
 * Uses the GSON streaming API to prettyprint or compact JSON documents.
 */
public final class JsonPrettyprint {
    public static void main(String... args) throws IOException {
        InputStream in = System.in;
        OutputStream out = System.out;
        boolean compact = false;
        boolean lenient = true;

        for (Iterator<String> i = Arrays.asList(args).iterator(); i.hasNext(); ) {
            String option = i.next();
            if (option.equals("--in")) {
                in = new FileInputStream(i.next());
            } else if (option.equals("--out")) {
                out = new FileOutputStream(i.next());
            } else if (option.equals("--compact")) {
                compact = true;
            } else if (option.equals("--strict")) {
                lenient = false;
            } else {
                System.err.println("Usage: JsonPrettyprint [options]");
                System.err.println("  --in <file>");
                System.err.println("  --out <file>");
                System.err.println("  --compact");
                System.err.println("  --strict");
                return;
            }
        }

        JsonWriter writer = new JsonWriter(new OutputStreamWriter(out));
        JsonReader reader = new JsonReader(new InputStreamReader(in));
        if (!compact) {
            writer.setIndent("    ");
        }
        reader.setLenient(lenient);
        prettyprint(reader, writer);
        writer.close();
        reader.close();
    }

    static void prettyprint(JsonReader reader, JsonWriter writer) throws IOException {
        while (true) {
            JsonToken token = reader.peek();
            switch (token) {
            case BEGIN_ARRAY:
                reader.beginArray();
                writer.beginArray();
                break;
            case END_ARRAY:
                reader.endArray();
                writer.endArray();
                break;
            case BEGIN_OBJECT:
                reader.beginObject();
                writer.beginObject();
                break;
            case END_OBJECT:
                reader.endObject();
                writer.endObject();
                break;
            case NAME:
                String name = reader.nextName();
                writer.name(name);
                break;
            case STRING:
                String s = reader.nextString();
                writer.value(s);
                break;
            case NUMBER:
                String n = reader.nextString();
                writer.value(new BigDecimal(n));
                break;
            case BOOLEAN:
                boolean b = reader.nextBoolean();
                writer.value(b);
                break;
            case NULL:
                reader.nextNull();
                writer.nullValue();
                break;
            case END_DOCUMENT:
                return;
            }
        }
    }
}

